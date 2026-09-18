"""Functional tests for the employer-facing flow: login, assessment creation/management,
JD role classification — using a real in-process app + real (throwaway, rolled-back) database,
with the Claude API mocked so nothing here makes a real network call.

Signup itself isn't covered here — it requires email OTP verification, which would need its
own mocking of the email-sending path; login (exercised via the employer_client fixture) and
everything downstream of an authenticated session is what's covered."""

from models.user import User
from security import hash_password
from anthropic_fakes import patch_anthropic_client, make_classify_response


def test_login_wrong_password_rejected(client, db_session):
    import main
    user_id = main.generate_user_id(db_session)
    email = f"{user_id.lower()}@test.example"
    user = User(user_id=user_id, full_name="Test", email=email, password_hash=hash_password("CorrectPass1!"), role="employer", status="active")
    db_session.add(user)
    db_session.commit()

    res = client.post("/api/auth/login/employer", json={"email": email, "password": "WrongPassword"})
    assert res.status_code == 401


def test_login_unknown_email_returns_404(client):
    res = client.post("/api/auth/login/employer", json={"email": "nobody@test.example", "password": "whatever"})
    assert res.status_code == 404


def test_create_assessment_happy_path(employer_client):
    res = employer_client.post("/api/employer/assessments", json={
        "title": "Scrum Master — Q1", "role_focus": "scrum_master",
    })
    assert res.status_code == 200, res.text
    assert res.json()["success"] is True
    assert res.json()["assessment_id"]


def test_create_assessment_invalid_role_focus_rejected(employer_client):
    res = employer_client.post("/api/employer/assessments", json={
        "title": "Bad Role", "role_focus": "astronaut",
    })
    assert res.status_code == 400


def test_create_assessment_empty_title_rejected(employer_client):
    res = employer_client.post("/api/employer/assessments", json={
        "title": "   ", "role_focus": "scrum_master",
    })
    assert res.status_code == 400


def test_create_assessment_num_questions_out_of_range_rejected(employer_client):
    res = employer_client.post("/api/employer/assessments", json={
        "title": "Too Many Questions", "role_focus": "scrum_master", "num_questions": 20,
    })
    assert res.status_code == 422


def test_create_assessment_duration_must_be_a_preset_value(employer_client):
    res = employer_client.post("/api/employer/assessments", json={
        "title": "Weird Duration", "role_focus": "scrum_master", "duration_minutes": 55,
    })
    assert res.status_code == 422


def test_create_assessment_blocked_jd_content_rejected_without_calling_ai(employer_client, monkeypatch):
    fake_client = patch_anthropic_client(monkeypatch, make_classify_response())
    res = employer_client.post("/api/employer/assessments", json={
        "title": "Bad JD", "role_focus": "scrum_master",
        "jd_text": "We need someone who will kill everyone on the competing team's product.",
    })
    assert res.status_code == 422
    assert fake_client.messages.last_call_kwargs is None  # never reached Claude


def test_create_assessment_rate_limit_kicks_in(employer_client):
    # Limit is 30/hour — hammer past it in a tight loop and confirm the Nth call 429s.
    last_status = None
    for _ in range(35):
        res = employer_client.post("/api/employer/assessments", json={
            "title": "Spam Test", "role_focus": "scrum_master",
        })
        last_status = res.status_code
        if last_status == 429:
            break
    assert last_status == 429


def test_classify_jd_role_returns_mocked_result(employer_client, monkeypatch):
    patch_anthropic_client(monkeypatch, make_classify_response(role_focus="product_owner", confidence="high"))
    res = employer_client.post("/api/employer/classify-jd-role", json={
        "jd_text": "Owns the backlog, defines acceptance criteria, prioritizes what ships next.",
    })
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["role_focus"] == "product_owner"
    assert body["confidence"] == "high"


def test_classify_jd_role_too_short_rejected(employer_client):
    res = employer_client.post("/api/employer/classify-jd-role", json={"jd_text": "short"})
    assert res.status_code == 400


def test_classify_jd_role_blocked_content_rejected_without_calling_ai(employer_client, monkeypatch):
    fake_client = patch_anthropic_client(monkeypatch, make_classify_response())
    res = employer_client.post("/api/employer/classify-jd-role", json={
        "jd_text": "This role requires you to send nudes as part of the interview process apparently.",
    })
    assert res.status_code == 422
    assert fake_client.messages.last_call_kwargs is None


def test_list_assessments_returns_created_assessment(employer_client):
    create_res = employer_client.post("/api/employer/assessments", json={
        "title": "List Me", "role_focus": "business_analyst",
    })
    assert create_res.status_code == 200
    list_res = employer_client.get("/api/employer/assessments")
    assert list_res.status_code == 200
    titles = [a["title"] for a in list_res.json()]
    assert "List Me" in titles


def test_employer_cannot_patch_another_employers_assessment(employer_client, client, db_session):
    import main
    create_res = employer_client.post("/api/employer/assessments", json={
        "title": "Owned By First Employer", "role_focus": "scrum_master",
    })
    assessment_id = create_res.json()["assessment_id"]

    # A second, separate employer account — same `client`/db_session, different login.
    other_user_id = main.generate_user_id(db_session)
    other_email = f"{other_user_id.lower()}@test.example"
    other_user = User(user_id=other_user_id, full_name="Other Employer", email=other_email,
                       password_hash=hash_password("OtherPass1!"), role="employer", status="active")
    db_session.add(other_user)
    db_session.flush()
    other_profile_id = main.generate_employer_profile_id(db_session)
    from models.employer_profile import EmployerProfile
    db_session.add(EmployerProfile(employer_profile_id=other_profile_id, user_id=other_user_id, company_name="Other Co"))
    db_session.commit()
    client.post("/api/auth/login/employer", json={"email": other_email, "password": "OtherPass1!"})

    res = client.patch(f"/api/employer/assessments/{assessment_id}", json={"title": "Hijacked"})
    assert res.status_code == 404
