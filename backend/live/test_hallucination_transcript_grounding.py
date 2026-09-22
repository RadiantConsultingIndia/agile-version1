"""Practical proxy for "does the AI make things up about the candidate?" — takes a real scored
result's summary/strengths/gaps/per_question_notes, and asks a second, independent Claude call
to verify each claim is actually traceable to what the candidate said in the transcript.

This is explicitly a proxy, not ground truth — an LLM judging another LLM's output can itself be
wrong. Treat a failure here as "worth a human looking at," not as definitive proof of a
hallucination."""

import main
from golden import load_golden, submit_golden_transcript

GROUNDING_TOOL = {
    "name": "claim_grounding_check",
    "description": "For each claim, say whether it's actually supported by the transcript.",
    "strict": True,
    "input_schema": {
        "type": "object",
        "properties": {
            "claims": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "claim": {"type": "string"},
                        "grounded": {"type": "boolean"},
                        "reasoning": {"type": "string", "description": "One short sentence on why."},
                    },
                    "required": ["claim", "grounded", "reasoning"],
                    "additionalProperties": False,
                },
            },
        },
        "required": ["claims"],
        "additionalProperties": False,
    },
}

MIN_GROUNDED_RATIO = 0.9


def _collect_claims(scorecard: dict) -> list[str]:
    # "gaps" is deliberately excluded: per its own tool-schema description in main.py, it's
    # "areas the recruiter should explore further" — forward-looking suggestions about what
    # wasn't covered, not claims about what the candidate said. They can never be "grounded in
    # the transcript" by definition, so checking them here would just be testing the wrong thing.
    claims = [scorecard["summary"]]
    claims += scorecard.get("strengths", [])
    claims += [n["assessment"] for n in scorecard.get("per_question_notes", [])]
    return [c for c in claims if c and c.strip()]


def test_scorecard_claims_are_grounded_in_the_transcript(employer_client, invite_factory):
    golden = load_golden("strong_candidate")
    scorecard = submit_golden_transcript(employer_client, invite_factory, golden)
    claims = _collect_claims(scorecard)
    assert claims, "No claims found on the scorecard to check — summary/strengths/gaps/notes were all empty."

    # The scoring prompt legitimately gives the AI browser-captured integrity signals (paste/tab
    # switch/fast-answer counts) alongside the Q&A transcript — a claim like "no integrity red
    # flags" is grounded in that data, not in the Q&A text alone, so the judge needs it too.
    transcript_text = "\n\n".join(qa["question"] + "\n" + qa["answer"] for qa in scorecard["qa_pairs"])
    transcript_text += (
        f"\n\n[INTEGRITY SIGNALS]\nPaste attempts: {scorecard.get('paste_count', 0)} "
        f"({scorecard.get('paste_suspicious_count', 0)} not matching question text)\n"
        f"Tab/window switches: {scorecard.get('tab_switch_count', 0)}\n"
        f"Unusually fast answers: {scorecard.get('fast_answer_count', 0)}\n"
        f"Timed out: {scorecard.get('timed_out', False)}"
    )
    claims_block = "\n".join(f"- {c}" for c in claims)

    client = main.anthropic.Anthropic(api_key=main.ANTHROPIC_API_KEY)
    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=1500,
        system=(
            "You are fact-checking claims made about a candidate against the actual interview transcript "
            "they came from. For each claim, decide if it's genuinely supported by something the candidate "
            "actually said — not just plausible-sounding, but traceable to specific content in the transcript. "
            "Be strict: a vague claim that isn't clearly backed by the text should be marked not grounded."
        ),
        tools=[GROUNDING_TOOL],
        tool_choice={"type": "tool", "name": "claim_grounding_check"},
        messages=[{"role": "user", "content": f"TRANSCRIPT:\n{transcript_text}\n\nCLAIMS TO CHECK:\n{claims_block}"}],
    )
    tool_block = next((b for b in response.content if b.type == "tool_use"), None)
    assert tool_block is not None, "Grounding-check call returned no tool_use block"

    results = tool_block.input["claims"]
    grounded_count = sum(1 for r in results if r["grounded"])
    ratio = grounded_count / len(results) if results else 0

    assert ratio >= MIN_GROUNDED_RATIO, (
        f"Only {grounded_count}/{len(results)} scorecard claims were grounded in the transcript "
        f"(need >= {MIN_GROUNDED_RATIO:.0%}). Ungrounded claims: "
        f"{[r for r in results if not r['grounded']]}"
    )
