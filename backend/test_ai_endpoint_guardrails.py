"""
Static regression guard for the guardrails added around AgileHire's AI-touching endpoints.
Two parts: (1) an AST check (same self-contained style as test_model_consistency.py — parses
main.py's source directly, no import needed) that every AI-touching endpoint actually carries
a rate-limit decorator; (2) direct import checks that the scoring/classification tools are
still in strict mode and the candidate-message length cap hasn't been silently removed.

This test is deliberately what proved Phase A ("build the missing guardrails") was needed in
the first place — before that work, this file's rate-limit check failed against
classify_jd_role and create_assessment, which had no rate limit at all.
"""
import ast
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent
MAIN_PY = BACKEND_DIR / "main.py"
_SOURCE = MAIN_PY.read_text(encoding="utf-8")
_TREE = ast.parse(_SOURCE)

# Every endpoint that either calls Claude directly, or lets a client trigger unlimited DB writes
# tied to an AI-touching feature, should carry its own rate limit — independent of whatever
# limiter is (or isn't) applied elsewhere in the call chain.
AI_TOUCHING_ENDPOINTS_REQUIRING_RATE_LIMIT = [
    "classify_jd_role",
    "create_assessment",
    "hire_message",
    "hire_submit",
    "ai_interview_message",
    "ai_interview_practice_message",
]


def _decorator_source(decorator_node) -> str:
    return ast.unparse(decorator_node)


def _function_defs_by_name():
    return {
        node.name: node
        for node in ast.walk(_TREE)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    }


FUNCTION_DEFS = _function_defs_by_name()


@pytest.mark.parametrize("function_name", AI_TOUCHING_ENDPOINTS_REQUIRING_RATE_LIMIT)
def test_ai_touching_endpoint_has_rate_limit(function_name):
    if function_name not in FUNCTION_DEFS:
        pytest.skip(f"{function_name} not found in main.py — route may have been renamed or removed")
    node = FUNCTION_DEFS[function_name]
    decorator_sources = [_decorator_source(d) for d in node.decorator_list]
    has_rate_limit = any("limiter.limit" in src for src in decorator_sources)
    assert has_rate_limit, (
        f"{function_name} (main.py:{node.lineno}) has no @limiter.limit(...) decorator. "
        f"Every AI-touching or AI-adjacent endpoint needs one — see guardrails.py and the Step 1 "
        f"guardrails work for why (classify_jd_role and create_assessment previously had none)."
    )


def test_hire_scoring_tool_is_strict_mode():
    import main
    assert main.HIRE_SCORING_TOOL["strict"] is True


def test_classify_role_tool_is_strict_mode():
    import main
    assert main.CLASSIFY_ROLE_TOOL["strict"] is True


def test_candidate_message_length_cap_is_still_configured():
    import guardrails
    assert 500 <= guardrails.MAX_CANDIDATE_MESSAGE_CHARS <= 20000
