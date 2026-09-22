# Load testing (Step 5)

Two Locust scripts, matching the QA plan's split:

- **`locustfile_normal.py`** — everyday employer endpoints (dashboard, assessments, candidates).
  No AI calls, no cost. Safe at real concurrency (50-200 simulated users).
- **`locustfile_ai.py`** — the AI-backed endpoints. Deliberately low concurrency (3-5 users), just
  to confirm the Step 1 rate limits actually hold under concurrent load. Every request here is a
  real, billed Claude API call — keep it short.

## One-time setup

1. **Create 1-3 disposable employer test accounts** through the normal AgileHire signup flow on
   whichever environment you're testing (staging or prod), and make sure each one can actually
   log in (verified/active, not pending). Don't use a real employer's account — `locustfile_normal`
   will create junk assessments under it.
2. **For `locustfile_ai.py`'s hire/message task only** (optional — skip this and it just won't run
   that task): create a handful of candidate invites under a test assessment (via the normal UI,
   using a throwaway candidate email you control — each invite sends a real email and consumes a
   real invite credit) and collect their invite tokens from the invite links.

## Running

```bash
cd backend/loadtests
pip install -r requirements.txt

# Everyday endpoints, 100 concurrent users, 3 minutes:
LOADTEST_BASE_URL=https://your-backend.onrender.com \
LOADTEST_EMPLOYERS="test1@example.com:Password1,test2@example.com:Password1" \
locust -f locustfile_normal.py --headless -u 100 -r 10 -t 3m --csv=results_normal

# AI endpoints, 5 users, 90 seconds:
LOADTEST_BASE_URL=https://your-backend.onrender.com \
LOADTEST_EMPLOYERS="test1@example.com:Password1" \
LOADTEST_INVITE_TOKENS="tok1,tok2,tok3,tok4,tok5" \
locust -f locustfile_ai.py --headless -u 5 -r 1 -t 90s --csv=results_ai
```

Drop `--headless -u ... -r ... -t ...` to instead get the interactive web UI at
`http://localhost:8089`, where you can watch requests/sec and response times live and start/stop
runs by hand.

## Reading the results

- `results_normal_stats.csv` / `results_ai_stats.csv` — per-endpoint request count, failure count,
  median/95th-percentile response time.
- **On `locustfile_normal`**: failures should be at/near 0%, except `/api/employer/assessments
  [create]` where occasional 429s are correct (30/hour rate limit, hit from one IP). A real failure
  is a 500, a timeout, or response times climbing sharply as load increases.
- **On `locustfile_ai`**: you *want* to see 429s appear once request volume crosses the configured
  per-minute limits (20/minute on both endpoints tested here) — that's the rate limiter working
  under real concurrency, not a bug. A real failure is a 500, a timeout, or the limiter never
  triggering at all despite clearly exceeding 20 requests/minute.

## Why not in CI

Unlike the fast test suite and the AI evaluation suite, this isn't wired into GitHub Actions to run
automatically — load testing needs a real target environment and deliberate, occasional runs
(before a launch, after a scaling-relevant change), not a check on every push.
