import os

# database.py creates a SQLAlchemy engine at import time. create_engine() is lazy — it doesn't
# actually connect until a query runs — but main.py's own module-level code (a few lines below
# the app definition) runs real ALTER TABLE / CREATE TABLE migrations the moment it's imported,
# which DOES require a real, working connection — not just a syntactically valid URL. In CI this
# points at a real throwaway Postgres service container (see backend-tests.yml); running locally
# without a real Postgres reachable at this URL will make `import main` fail loudly — that's
# expected, only the AST-based test_model_consistency.py is designed to run with no real database.
os.environ.setdefault("DATABASE_URL", "postgresql://ci:ci@localhost:5432/ci_test_db")
os.environ.setdefault("SECRET_KEY", "ci-test-secret-key-not-for-production")
# Only needs to be non-empty to satisfy `if not ANTHROPIC_API_KEY` guards in main.py — every actual
# Claude call in these tests is mocked (see anthropic_fakes.py), so this value is never really used.
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-test-fake-key-not-for-production")

import pytest
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

import main
import database
from models.user import User
from models.employer_profile import EmployerProfile
from security import hash_password


@pytest.fixture()
def db_session():
    """One test = one transaction, rolled back at the end — keeps tests isolated from each other
    without recreating the schema (already created once, by importing main above)."""
    connection = database.engine.connect()
    transaction = connection.begin()
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture()
def client(db_session):
    # main.app was wrapped in ProxyHeadersMiddleware at the bottom of main.py (so Render sees
    # candidates' real IPs, not its own proxy IP) — the actual FastAPI instance, the one with
    # .dependency_overrides, lives at main.app.app; main.app itself is just the ASGI wrapper.
    fastapi_app = getattr(main.app, "app", main.app)
    fastapi_app.dependency_overrides[main.get_db] = lambda: db_session
    test_client = TestClient(main.app)
    try:
        yield test_client
    finally:
        fastapi_app.dependency_overrides.clear()


@pytest.fixture()
def employer_client(client, db_session):
    """A logged-in employer: real User + EmployerProfile rows, then a real login through the
    actual endpoint (not a minted token) so auth logic itself is exercised, not bypassed."""
    user_id = main.generate_user_id(db_session)
    password = "TestPass123!"
    email = f"{user_id.lower()}@test.example"
    user = User(
        user_id=user_id, full_name="Test Employer", email=email,
        password_hash=hash_password(password), role="employer", status="active",
    )
    db_session.add(user)
    db_session.flush()
    profile = EmployerProfile(
        employer_profile_id=main.generate_employer_profile_id(db_session),
        user_id=user_id, company_name="Test Co",
    )
    db_session.add(profile)
    db_session.commit()

    res = client.post("/api/auth/login/employer", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return client


@pytest.fixture()
def invite_factory(employer_client, db_session):
    """Creates a real Assessment (owned by a real, logged-in employer) + a real CandidateInvite.
    Returns a factory so a test can override candidate name/email/expiry/assessment options as
    needed, without every candidate-flow test repeating the same setup boilerplate."""
    import secrets
    from datetime import datetime, timedelta, timezone
    from models.candidate_invite import CandidateInvite

    def _make(candidate_name="Test Candidate", candidate_email="candidate@test.example",
              expires_at=None, assessment_overrides=None):
        assessment_body = {"title": "Candidate Flow Test", "role_focus": "scrum_master", "num_questions": 3}
        assessment_body.update(assessment_overrides or {})
        create_res = employer_client.post("/api/employer/assessments", json=assessment_body)
        assert create_res.status_code == 200, create_res.text
        assessment_id = create_res.json()["assessment_id"]
        candidate_invite = CandidateInvite(
            invite_token=secrets.token_urlsafe(32), assessment_id=assessment_id,
            candidate_name=candidate_name, candidate_email=candidate_email,
            expires_at=expires_at or (datetime.now(timezone.utc) + timedelta(days=14)),
        )
        db_session.add(candidate_invite)
        db_session.commit()
        return candidate_invite

    return _make


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    # slowapi's in-memory limiter storage persists across tests within the same pytest process —
    # without this, a test that deliberately hits a rate limit would leak into and flake later,
    # unrelated tests that happen to share the same limiter key (IP address) in TestClient.
    main.limiter.reset()
    yield
