"""Load test for AgileHire's AI-backed endpoints — deliberately run at very low concurrency
(3-5 simulated users), just to confirm the guardrail rate limits from Step 1 actually trigger
correctly under real concurrent load. This is NOT a stress test: every request here costs a real,
billed Claude API call, so keep -u small and -t short.

Two endpoints are covered:

1. `classify-jd-role` (20/minute, employer-authenticated, Haiku model, no side effects beyond the
   API call) — the safe, repeatable one. This is the primary signal: with 3-5 users looping every
   1-2s, you should see 200s for a while, then a run of 429s once the shared IP crosses 20
   calls/minute, proving the limiter works under concurrency (not just in a single-request test).

2. `hire/{token}/message` (20/minute, public/candidate-facing) — has real side effects to know
   about: each token can only be used for ONE realistic "candidate starts" call before the app's
   own state machine (not the rate limiter) rejects a second fresh-start call as 409 "already in
   progress". So this needs a small pre-created pool of invite tokens (see README.md) and will
   naturally stop generating new signal once the pool is exhausted — that's expected, not a bug.
   Skipped entirely if LOADTEST_INVITE_TOKENS isn't set.

Usage:
    pip install -r requirements.txt
    LOADTEST_BASE_URL=https://your-backend.onrender.com \
    LOADTEST_EMPLOYERS="test1@example.com:Password1" \
    LOADTEST_INVITE_TOKENS="tok1,tok2,tok3,tok4,tok5" \
    locust -f locustfile_ai.py --headless -u 5 -r 1 -t 90s --csv=results_ai
"""

import logging
import random
import threading

import requests
from locust import HttpUser, between, events, task

from common import BASE_URL, EMPLOYER_POOL, INVITE_TOKENS

log = logging.getLogger(__name__)

SAMPLE_JD = (
    "We're looking for someone to run daily standups, manage the sprint backlog, remove "
    "blockers for the engineering team, and report progress to stakeholders every week."
)

_sessions = []
_token_lock = threading.Lock()
_remaining_tokens = list(INVITE_TOKENS)


@events.test_start.add_listener
def _login_pool(environment, **kwargs):
    if not EMPLOYER_POOL:
        raise RuntimeError(
            "No LOADTEST_EMPLOYERS configured. Set it to a comma-separated email:password list "
            "of pre-created, verified employer test accounts (see README.md)."
        )
    for account in EMPLOYER_POOL:
        resp = requests.post(
            f"{BASE_URL}/api/auth/login/employer",
            json={"email": account["email"], "password": account["password"]},
            timeout=10,
        )
        if resp.status_code == 200:
            _sessions.append(resp.cookies.get_dict())
        else:
            log.warning(f"Load test login failed for {account['email']}: {resp.status_code} {resp.text}")
    if not _sessions:
        raise RuntimeError("None of the configured LOADTEST_EMPLOYERS could log in — check credentials/status.")
    if not INVITE_TOKENS:
        log.warning("No LOADTEST_INVITE_TOKENS set — the hire/message rate-limit task will be skipped.")


def _take_token():
    with _token_lock:
        return _remaining_tokens.pop() if _remaining_tokens else None


class AiEndpointUser(HttpUser):
    host = BASE_URL
    wait_time = between(1, 2)

    def on_start(self):
        if not _sessions:
            self.environment.runner.quit()
            return
        self.client.cookies.update(random.choice(_sessions))

    @task(4)
    def classify_jd_role(self):
        self.client.post(
            "/api/employer/classify-jd-role",
            json={"jd_text": SAMPLE_JD},
            name="/api/employer/classify-jd-role",
        )

    @task(1)
    def start_hire_message(self):
        token = _take_token()
        if not token:
            return
        self.client.post(
            f"/api/public/hire/{token}/message",
            json={"messages": [{"role": "user", "content": "Hi, I'm ready to start the assessment."}]},
            name="/api/public/hire/[token]/message",
        )
