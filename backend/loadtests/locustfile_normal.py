"""Load test for AgileHire's everyday, non-AI employer endpoints: browsing the dashboard,
viewing assessments and candidates, creating assessments. None of these call the Claude API, so
this is safe to run at real concurrency (50-200 simulated users) with no AI cost.

One real side effect to know about: `create_assessment` actually writes rows to the database (no
email, no credits consumed) — expect the test employer account(s) to accumulate load-test
assessments over a run. Fine for disposable test accounts; don't point this at a real employer's
account.

Usage:
    pip install -r requirements.txt
    LOADTEST_BASE_URL=https://your-backend.onrender.com \
    LOADTEST_EMPLOYERS="test1@example.com:Password1,test2@example.com:Password1" \
    locust -f locustfile_normal.py --headless -u 100 -r 10 -t 3m --csv=results_normal

    -u = concurrent (simulated) users, -r = ramp-up rate (users started per second), -t = run duration.
    Drop --headless (and -u/-r/-t) to use the interactive web UI at http://localhost:8089 instead.
"""

import logging
import random

import requests
from locust import HttpUser, between, events, task

from common import BASE_URL, EMPLOYER_POOL

log = logging.getLogger(__name__)

ROLE_FOCUS_CHOICES = ["scrum_master", "project_manager", "product_owner", "business_analyst"]

# Filled once at test start (not per simulated user) with each pool account's login cookies.
_sessions = []


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
        if resp.status_code != 200:
            log.warning(f"Load test login failed for {account['email']}: {resp.status_code} {resp.text}")
            continue
        _sessions.append(resp.cookies.get_dict())
    if not _sessions:
        raise RuntimeError("None of the configured LOADTEST_EMPLOYERS could log in — check credentials/status.")
    log.info(f"Load test: {len(_sessions)}/{len(EMPLOYER_POOL)} employer accounts logged in.")


class EmployerBrowsing(HttpUser):
    host = BASE_URL
    wait_time = between(1, 3)

    def on_start(self):
        if not _sessions:
            self.environment.runner.quit()
            return
        self.client.cookies.update(random.choice(_sessions))
        self._assessment_ids = []

    @task(5)
    def list_assessments(self):
        resp = self.client.get("/api/employer/assessments", name="/api/employer/assessments [list]")
        if resp.status_code == 200:
            self._assessment_ids = [a["assessment_id"] for a in resp.json()]

    @task(3)
    def view_profile(self):
        self.client.get("/api/employer/profile")

    @task(2)
    def view_credits(self):
        self.client.get("/api/employer/credits")

    @task(4)
    def view_assessment_detail(self):
        if not self._assessment_ids:
            return
        assessment_id = random.choice(self._assessment_ids)
        self.client.get(f"/api/employer/assessments/{assessment_id}", name="/api/employer/assessments/[id]")

    @task(1)
    def create_assessment(self):
        # Kept low-weight: this endpoint is rate-limited (30/hour per IP), and a load test
        # generator hits it from one IP — occasional 429s here are correct behavior, not a bug.
        self.client.post(
            "/api/employer/assessments",
            json={
                "title": f"Load Test Assessment {random.randint(1, 1_000_000)}",
                "role_focus": random.choice(ROLE_FOCUS_CHOICES),
                "num_questions": 5, "duration_minutes": 30,
                "difficulty": "medium", "question_style": "scenario",
            },
            name="/api/employer/assessments [create]",
        )
