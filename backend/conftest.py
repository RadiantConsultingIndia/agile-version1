import os

import pytest

# This whole `live/` folder makes real, paid calls to the Claude API — deliberately excluded
# from the fast, every-push test suite (see --ignore=live in backend-tests.yml) and run instead
# via its own on-demand/scheduled workflow (ai-eval-live.yml). If no real key is present, every
# test in this directory should skip cleanly rather than run and fail confusingly against the
# app's own "not configured" 503 — an autouse fixture is the reliable way to do that (unlike a
# bare module-level pytest.skip() in conftest.py, which doesn't consistently propagate to skip
# sibling test files the way it does inside an actual test module).


def _has_real_key() -> bool:
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    # The parent conftest.py sets this exact fake value via os.environ.setdefault() purely so the
    # fast suite's mocked-AI tests can pass the `if not ANTHROPIC_API_KEY` guards in main.py.
    return bool(key) and not key.startswith("sk-test-fake")


@pytest.fixture(autouse=True)
def _require_real_anthropic_key():
    if not _has_real_key():
        pytest.skip(
            "No real ANTHROPIC_API_KEY set — skipping live AI evaluation tests. These make real, "
            "billed Claude API calls, so they only run with a real key (see ai-eval-live.yml)."
        )
