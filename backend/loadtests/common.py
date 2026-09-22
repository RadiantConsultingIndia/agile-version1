"""Shared config for both load test scripts."""

import os

BASE_URL = os.environ.get("LOADTEST_BASE_URL", "http://localhost:8000")


def _load_employer_pool():
    # A small pool of pre-created, already-verified employer accounts — load testing should
    # never hit the rate-limited /api/auth/login endpoint once per simulated user (it's
    # 5/minute; 50-200 concurrent users would collapse under that immediately). Instead each
    # pool account logs in once at test start, and every simulated user borrows one of their
    # already-authenticated sessions. Format: "email1:password1,email2:password2".
    raw = os.environ.get("LOADTEST_EMPLOYERS", "")
    accounts = []
    for entry in raw.split(","):
        entry = entry.strip()
        if not entry:
            continue
        email, _, password = entry.partition(":")
        if email and password:
            accounts.append({"email": email, "password": password})
    return accounts


EMPLOYER_POOL = _load_employer_pool()

# Pre-created invite tokens for exercising the public candidate-facing AI endpoints
# (/api/public/hire/{token}/message and /submit). Each token is only good for one realistic
# "candidate starts the assessment" call before the app's own state machine considers it
# already in progress, so these must be created ahead of time in whatever quantity the AI
# load test needs — see README.md. Format: "token1,token2,token3".
INVITE_TOKENS = [t.strip() for t in os.environ.get("LOADTEST_INVITE_TOKENS", "").split(",") if t.strip()]
