import re

# Generous enough for a genuine multi-paragraph answer, tight enough to bound cost/abuse risk.
MAX_CANDIDATE_MESSAGE_CHARS = 4000

# First line of defense, not a full moderation solution — a curated keyword/regex sweep for
# categories that should never reach the AI or a human reviewer's screen. If false negatives
# prove common after launch, replace/augment with a hosted moderation API or a cheap
# classification call rather than growing this list indefinitely.
_BLOCKED_PATTERNS = {
    "self_harm": [
        r"\bkill myself\b", r"\bsuicid(e|al)\b", r"\bself[\s-]?harm\b", r"\bend my life\b",
    ],
    "violence_threat": [
        r"\bi will kill\b", r"\bgoing to shoot\b", r"\bbomb (threat|the)\b", r"\bmass shooting\b",
    ],
    "explicit_sexual": [
        r"\bsend nudes\b", r"\bexplicit (photo|video)s?\b",
    ],
    "hate_harassment": [
        r"\b(kill|gas) all \w+\b", r"\bsubhuman\b", r"\bethnic cleansing\b",
    ],
}
_COMPILED_BLOCKED_PATTERNS = {
    category: [re.compile(p, re.IGNORECASE) for p in patterns]
    for category, patterns in _BLOCKED_PATTERNS.items()
}

# Logging-only signal, never used to block — blocking on these phrases alone would false-positive
# on ordinary work-context answers (e.g. "we decided to ignore the original timeline and...").
# Real blocking is handled by contains_blocked_content(); this just flags a transcript for review.
_INJECTION_PATTERNS = [
    re.compile(p, re.IGNORECASE) for p in [
        r"ignore (all|the)?\s*(previous|prior|above) instructions",
        r"disregard (the )?(above|previous) instructions",
        r"new instructions\s*:",
        r"you are now\b",
        r"\bsystem prompt\b",
        r"\[\[.*(complete|override|unlock).*\]\]",
    ]
]


def wrap_untrusted(label: str, text: str) -> str:
    """Wraps employer/candidate-supplied text with a clearly-labeled boundary so the AI can tell
    reference data apart from instructions, even if the text itself claims to be a system message."""
    return f"--- {label} ---\n{text}\n--- END {label} ---"


def contains_blocked_content(text: str) -> tuple[bool, str | None]:
    """Returns (blocked, category). Cheap, deterministic — always run before an AI call, never after."""
    if not text:
        return False, None
    for category, patterns in _COMPILED_BLOCKED_PATTERNS.items():
        for pattern in patterns:
            if pattern.search(text):
                return True, category
    return False, None


def looks_like_injection_attempt(text: str) -> bool:
    """Heuristic only — for logging/flagging, never for blocking. See module docstring above."""
    if not text:
        return False
    return any(pattern.search(text) for pattern in _INJECTION_PATTERNS)
