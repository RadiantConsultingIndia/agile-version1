"""Does changing the assessment's configured question_style actually change the AI's output, or
is it ignored? Trimmed to just the question_style axis (not the full role x difficulty x style
matrix) to keep this cheap. Samples 3 real questions per style (not just 1) and requires a 2-of-3
majority match — a single sample is too noisy a signal given normal LLM run-to-run variance;
what actually matters is whether the style is respected *most* of the time, not every single time."""

import pytest

import main

CLASSIFY_STYLE_TOOL = {
    "name": "classify_question_style",
    "description": "Classify which of the 3 question styles this text actually reads as.",
    "strict": True,
    "input_schema": {
        "type": "object",
        "properties": {
            "style": {"type": "string", "enum": ["scenario", "situational", "short_answer"]},
        },
        "required": ["style"],
        "additionalProperties": False,
    },
}

STYLE_DESCRIPTIONS = {
    "scenario": "a scenario: a realistic on-the-job situation described in a few sentences, then a question",
    "situational": "a short, punchy situational-judgment call — 'what would you do if...' without a long narrative setup",
    "short_answer": "a direct question expecting a short, focused answer, not a scenario",
}


def _judge_style(question_text: str) -> str:
    client = main.anthropic.Anthropic(api_key=main.ANTHROPIC_API_KEY)
    descriptions = "\n".join(f"- {style}: {desc}" for style, desc in STYLE_DESCRIPTIONS.items())
    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=100,
        system=f"Classify which of these 3 question styles the given text actually reads as:\n{descriptions}",
        tools=[CLASSIFY_STYLE_TOOL],
        tool_choice={"type": "tool", "name": "classify_question_style"},
        messages=[{"role": "user", "content": question_text}],
    )
    tool_block = next((b for b in response.content if b.type == "tool_use"), None)
    assert tool_block is not None
    return tool_block.input["style"]


SAMPLES_PER_STYLE = 3
MIN_MATCHES_REQUIRED = 2  # majority of 3


@pytest.mark.parametrize("question_style", ["scenario", "situational", "short_answer"])
def test_question_style_is_actually_reflected_in_output(employer_client, invite_factory, question_style):
    judged_styles = []
    generated_texts = []
    for _ in range(SAMPLES_PER_STYLE):
        candidate_invite = invite_factory(assessment_overrides={
            "role_focus": "scrum_master", "num_questions": 3, "question_style": question_style,
            "title": f"Adaptability Test - {question_style}",
        })
        res = employer_client.post(f"/api/public/hire/{candidate_invite.invite_token}/message", json={
            "messages": [{"role": "user", "content": "Hi, I'm ready to start the assessment."}],
        })
        assert res.status_code == 200, res.text
        generated_question = res.json()["reply"]
        generated_texts.append(generated_question)
        if not generated_question.strip():
            # An empty reply is itself a failure to reflect the configured style — count it as a
            # non-match rather than sending empty content to the judge call, which the Anthropic
            # API rejects outright (400 invalid_request_error), crashing the whole test instead of
            # just this one sample.
            judged_styles.append("(empty reply)")
            continue
        judged_styles.append(_judge_style(generated_question))

    matches = sum(1 for s in judged_styles if s == question_style)
    assert matches >= MIN_MATCHES_REQUIRED, (
        f"Configured question_style='{question_style}' only matched {matches}/{SAMPLES_PER_STYLE} samples "
        f"(judged as: {judged_styles}). Generated texts: {generated_texts}"
    )
