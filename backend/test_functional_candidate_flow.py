"""Functional tests for the candidate-facing assessment flow: answering, submitting, the
"ran out of time" bypass, and the integrity-signal scoring instructions — the parts of item 7
("integrity testing") that are fully deterministic and don't need a live AI call to verify."""

from datetime import datetime, timedelta, timezone

import pytest

from models.candidate_result import CandidateResult
from anthropic_fakes import patch_anthropic_client, make_chat_reply_response, make_scoring_response


@pytest.fixture()
def invite(invite_factory):
    return invite_factory()


def test_hire_message_happy_path(client, invite, monkeypatch):
    fake = patch_anthropic_client(monkeypatch, make_chat_reply_response("**Scenario 1:**\n\nA teammate missed a deadline.\n\nWhat would you do?"))
    res = client.post(f"/api/public/hire/{invite.invite_token}/message", json={
        "messages": [{"role": "user", "content": "Hi, I'm ready to start the assessment."}],
    })
    assert res.status_code == 200, res.text
    assert "Scenario 1" in res.json()["reply"]
    assert fake.messages.last_call_kwargs is not None


def test_hire_message_oversized_answer_rejected(client, invite):
    res = client.post(f"/api/public/hire/{invite.invite_token}/message", json={
        "messages": [{"role": "user", "content": "x" * 4001}],
    })
    assert res.status_code == 422


def test_hire_message_empty_answer_rejected(client, invite):
    res = client.post(f"/api/public/hire/{invite.invite_token}/message", json={
        "messages": [{"role": "user", "content": "   "}],
    })
    assert res.status_code == 422


def test_hire_message_expired_invite_rejected(client, db_session, invite):
    invite.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
    db_session.commit()
    res = client.post(f"/api/public/hire/{invite.invite_token}/message", json={
        "messages": [{"role": "user", "content": "Hi, I'm ready to start the assessment."}],
    })
    assert res.status_code == 410


def test_hire_message_blocked_content_rejected_without_calling_ai(client, invite, monkeypatch):
    fake = patch_anthropic_client(monkeypatch, make_chat_reply_response())
    res = client.post(f"/api/public/hire/{invite.invite_token}/message", json={
        "messages": [
            {"role": "user", "content": "Hi, I'm ready to start the assessment."},
            {"role": "assistant", "content": "**Scenario 1:**\n\nA teammate missed a deadline.\n\nWhat would you do?"},
            {"role": "user", "content": "i will kill everyone on this team if that happens again"},
        ],
    })
    assert res.status_code == 400
    assert fake.messages.last_call_kwargs is None


def test_hire_submit_too_few_answers_rejected(client, invite, monkeypatch):
    patch_anthropic_client(monkeypatch, make_scoring_response())
    res = client.post(f"/api/public/hire/{invite.invite_token}/submit", json={
        "messages": [{"role": "user", "content": "Hi, I'm ready to start the assessment."}],
    })
    assert res.status_code == 400


def test_hire_submit_timed_out_bypasses_min_messages(client, invite, monkeypatch):
    patch_anthropic_client(monkeypatch, make_scoring_response())
    res = client.post(f"/api/public/hire/{invite.invite_token}/submit", json={
        "messages": [
            {"role": "user", "content": "Hi, I'm ready to start the assessment."},
            {"role": "assistant", "content": "**Scenario 1:**\n\nA teammate missed a deadline.\n\nWhat would you do?"},
            {"role": "user", "content": "I'd talk to them directly to understand what happened."},
        ],
        "timed_out": True,
    })
    assert res.status_code == 200, res.text


def test_hire_submit_happy_path_marks_invite_completed(client, db_session, invite, monkeypatch):
    patch_anthropic_client(monkeypatch, make_scoring_response(overall_score=82, recommendation="Strong Match"))
    messages = [
        {"role": "user", "content": "Hi, I'm ready to start the assessment."},
        {"role": "assistant", "content": "**Scenario 1:**\n\nA teammate missed a deadline.\n\nWhat would you do?"},
        {"role": "user", "content": "I'd talk to them directly to understand what happened."},
        {"role": "assistant", "content": "**Scenario 2:**\n\nTwo stakeholders disagree on scope.\n\nWhat would you do?"},
        {"role": "user", "content": "I'd facilitate a session to align on priorities."},
    ]
    res = client.post(f"/api/public/hire/{invite.invite_token}/submit", json={"messages": messages})
    assert res.status_code == 200, res.text

    db_session.refresh(invite)
    assert invite.status == "completed"
    result = db_session.query(CandidateResult).filter(CandidateResult.invite_token == invite.invite_token).first()
    assert result is not None
    assert result.overall_score == 82
    assert result.recommendation == "Strong Match"


def test_hire_submit_duplicate_short_circuits_without_second_ai_call(client, db_session, invite, monkeypatch):
    fake = patch_anthropic_client(monkeypatch, make_scoring_response())
    messages = [
        {"role": "user", "content": "Hi, I'm ready to start the assessment."},
        {"role": "assistant", "content": "**Scenario 1:**\n\nA teammate missed a deadline.\n\nWhat would you do?"},
        {"role": "user", "content": "I'd talk to them directly to understand what happened."},
        {"role": "assistant", "content": "**Scenario 2:**\n\nTwo stakeholders disagree on scope.\n\nWhat would you do?"},
        {"role": "user", "content": "I'd facilitate a session to align on priorities."},
    ]
    first = client.post(f"/api/public/hire/{invite.invite_token}/submit", json={"messages": messages})
    assert first.status_code == 200
    first_call_kwargs = fake.messages.last_call_kwargs
    assert first_call_kwargs is not None

    second = client.post(f"/api/public/hire/{invite.invite_token}/submit", json={"messages": messages})
    assert second.status_code == 200
    # last_call_kwargs is unchanged — the duplicate submit never reached Claude a second time.
    assert fake.messages.last_call_kwargs is first_call_kwargs


@pytest.mark.parametrize("paste_count,paste_suspicious_count,expected_snippet", [
    (0, 0, None),
    (1, 1, "1 paste attempt whose content did NOT match"),
    (2, 2, "2 separate paste attempts whose content did NOT match"),
    (1, 0, "closely matched the text of the question itself"),
])
def test_integrity_block_text_varies_by_suspicious_paste_count(client, invite, monkeypatch, paste_count, paste_suspicious_count, expected_snippet):
    fake = patch_anthropic_client(monkeypatch, make_scoring_response())
    messages = [
        {"role": "user", "content": "Hi, I'm ready to start the assessment."},
        {"role": "assistant", "content": "**Scenario 1:**\n\nA teammate missed a deadline.\n\nWhat would you do?"},
        {"role": "user", "content": "I'd talk to them directly to understand what happened."},
        {"role": "assistant", "content": "**Scenario 2:**\n\nTwo stakeholders disagree on scope.\n\nWhat would you do?"},
        {"role": "user", "content": "I'd facilitate a session to align on priorities."},
    ]
    res = client.post(f"/api/public/hire/{invite.invite_token}/submit", json={
        "messages": messages, "paste_count": paste_count, "paste_suspicious_count": paste_suspicious_count,
    })
    assert res.status_code == 200, res.text
    sent_content = fake.messages.last_call_kwargs["messages"][0]["content"]
    if expected_snippet:
        assert expected_snippet in sent_content
    if paste_suspicious_count >= 2:
        assert 'overall_score MUST be 30 or lower and recommendation MUST be "Not Recommended"' in sent_content
