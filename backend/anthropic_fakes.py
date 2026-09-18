"""Shared fakes for the Claude API so functional tests never make a real (costly, slow,
non-deterministic) network call. Mirrors just enough of the real SDK response shape for
main.py's existing parsing code to work completely unmodified — see the `.type`/`.text`/
`.input`/`.usage.input_tokens`/`.usage.output_tokens` accesses main.py:1707-2723 rely on."""

from types import SimpleNamespace

import main


def make_usage(input_tokens=100, output_tokens=50):
    return SimpleNamespace(input_tokens=input_tokens, output_tokens=output_tokens)


def make_text_response(text, input_tokens=100, output_tokens=50):
    block = SimpleNamespace(type="text", text=text)
    return SimpleNamespace(content=[block], usage=make_usage(input_tokens, output_tokens))


def make_tool_response(tool_input: dict, input_tokens=100, output_tokens=50):
    block = SimpleNamespace(type="tool_use", input=tool_input)
    return SimpleNamespace(content=[block], usage=make_usage(input_tokens, output_tokens))


def make_chat_reply_response(text="**Scenario 1:**\n\nA teammate missed a deadline.\n\nWhat would you do?"):
    return make_text_response(text)


def make_scoring_response(overall_score=75, recommendation="Consider", summary="A solid, calibrated candidate.",
                           strengths=None, gaps=None, competency_scores=None, per_question_notes=None, integrity_notes=None):
    return make_tool_response({
        "overall_score": overall_score,
        "recommendation": recommendation,
        "summary": summary,
        "strengths": strengths or ["Clear communication", "Structured thinking"],
        "gaps": gaps or ["Could go deeper on trade-offs"],
        "competency_scores": competency_scores or [{"category": "Prioritization & trade-off decisions under real time/resource constraints", "score": overall_score}],
        "per_question_notes": per_question_notes or [{"question": "Missed deadline scenario", "assessment": "Reasonable, if generic, response."}],
        "integrity_notes": integrity_notes or [],
    })


def make_classify_response(role_focus="scrum_master", confidence="high"):
    return make_tool_response({"role_focus": role_focus, "confidence": confidence})


class FakeMessages:
    def __init__(self, response_or_factory):
        self._response_or_factory = response_or_factory
        self.last_call_kwargs = None

    def create(self, **kwargs):
        self.last_call_kwargs = kwargs
        if callable(self._response_or_factory):
            return self._response_or_factory(**kwargs)
        return self._response_or_factory


class FakeAnthropicClient:
    def __init__(self, response_or_factory):
        self.messages = FakeMessages(response_or_factory)

    def __call__(self, *args, **kwargs):
        # anthropic.Anthropic(api_key=...) is called fresh inside each route — patching the class
        # itself (see patch_anthropic_client below) means each of those calls returns this same
        # instance, so tests can still inspect exactly what was sent via `.messages.last_call_kwargs`.
        return self


def patch_anthropic_client(monkeypatch, response_or_factory):
    """Patches the Anthropic class as main.py references it (main.anthropic.Anthropic), not the
    anthropic package globally — keeps the patch scoped to this test module only. Returns the fake
    client instance so a test can assert on `.messages.last_call_kwargs` (e.g. to prove a blocked
    request never actually reached this point, or to inspect the exact prompt/content sent)."""
    fake_client = FakeAnthropicClient(response_or_factory)
    monkeypatch.setattr(main.anthropic, "Anthropic", fake_client)
    return fake_client
