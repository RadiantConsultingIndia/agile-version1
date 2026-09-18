"""Locks in a property the bias/diversity design (Step 4) depends on: the candidate's name and
email never reach the scoring prompt sent to Claude, only their actual answer text does — so a
future refactor can't silently reintroduce a bias vector without this test failing first."""

from anthropic_fakes import patch_anthropic_client, make_scoring_response


def test_candidate_identity_never_reaches_scoring_prompt(client, invite_factory, monkeypatch):
    fake = patch_anthropic_client(monkeypatch, make_scoring_response())
    candidate_invite = invite_factory(candidate_name="Zzyzx Unmistakeable Name", candidate_email="zzyzx-unmistakeable@test.example")
    messages = [
        {"role": "user", "content": "Hi, I'm ready to start the assessment."},
        {"role": "assistant", "content": "**Scenario 1:**\n\nA teammate missed a deadline.\n\nWhat would you do?"},
        {"role": "user", "content": "I'd talk to them directly to understand what happened."},
        {"role": "assistant", "content": "**Scenario 2:**\n\nTwo stakeholders disagree on scope.\n\nWhat would you do?"},
        {"role": "user", "content": "I'd facilitate a session to align on priorities."},
    ]
    res = client.post(f"/api/public/hire/{candidate_invite.invite_token}/submit", json={"messages": messages})
    assert res.status_code == 200, res.text

    sent_content = fake.messages.last_call_kwargs["messages"][0]["content"]
    assert "Zzyzx Unmistakeable Name" not in sent_content
    assert "zzyzx-unmistakeable@test.example" not in sent_content
