"""Shared helper for loading golden transcript fixtures and running them through the real,
live scoring pipeline — reuses the same client/invite_factory fixtures as the fast mocked test
suite (from the parent backend/conftest.py), just without mocking the Anthropic client, so this
exercises the exact same code path a real candidate submission goes through."""

import json
from pathlib import Path

GOLDEN_DIR = Path(__file__).resolve().parent  # the .json fixture files live alongside this file, in live/


def load_golden(name: str) -> dict:
    return json.loads((GOLDEN_DIR / f"{name}.json").read_text(encoding="utf-8"))


def submit_golden_transcript(employer_client, invite_factory, golden: dict, num_questions: int = 3) -> dict:
    # num_questions must be >= 3 — that's the app's own validation floor (see AssessmentBody),
    # even though these golden transcripts only have 2 real Q&A exchanges. That's fine: the
    # min_messages check in hire_submit is just a floor (max(2, num_questions*2-2) = 4 here),
    # and the transcript's 6 messages clear it regardless of what num_questions is configured to.
    """Creates a real assessment + invite, submits the golden transcript for real scoring
    through the actual /submit endpoint, and returns the resulting scorecard."""
    candidate_invite = invite_factory(assessment_overrides={
        "role_focus": "scrum_master", "num_questions": num_questions, "title": "Live Eval",
    })
    body = {
        "messages": golden["messages"],
        "paste_count": golden.get("paste_count", 0),
        "paste_suspicious_count": golden.get("paste_suspicious_count", 0),
    }
    res = employer_client.post(f"/api/public/hire/{candidate_invite.invite_token}/submit", json=body)
    assert res.status_code == 200, f"Submit failed: {res.text}"

    scorecard_res = employer_client.get(
        f"/api/employer/assessments/{candidate_invite.assessment_id}/invites/{candidate_invite.invite_token}"
    )
    assert scorecard_res.status_code == 200, scorecard_res.text
    return scorecard_res.json()
