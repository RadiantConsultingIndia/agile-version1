"""Does changing the assessment's configured question_style actually change the AI's output, or
is it ignored? Trimmed to just the question_style axis (not the full role x difficulty x style
matrix) to keep this cheap — one real question-generation call per style, plus one cheap judge
call to classify which style it actually reads as."""

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


@pytest.mark.parametrize("question_style", ["scenario", "situational", "short_answer"])
def test_question_style_is_actually_reflected_in_output(employer_client, invite_factory, question_style):
    candidate_invite = invite_factory(assessment_overrides={
        "role_focus": "scrum_master", "num_questions": 3, "question_style": question_style,
        "title": f"Adaptability Test - {question_style}",
    })
    res = employer_client.post(f"/api/public/hire/{candidate_invite.invite_token}/message", json={
        "messages": [{"role": "user", "content": "Hi, I'm ready to start the assessment."}],
    })
    assert res.status_code == 200, res.text
    generated_question = res.json()["reply"]

    judged_style = _judge_style(generated_question)
    assert judged_style == question_style, (
        f"Configured question_style='{question_style}' but the generated question reads as "
        f"'{judged_style}' instead. Generated text: {generated_question}"
    )
