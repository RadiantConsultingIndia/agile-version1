"""Does the scoring pipeline actually score well, not just run without crashing? Uses real,
billed Claude calls against curated golden transcripts (see golden_transcripts/) with known-
expected outcomes. Also covers the "relevance screening" checklist item via the vague/generic
fixture, and "evaluation score sanity" — that the recommendation and the numeric score actually
agree with each other — as a cross-field check across all of them.

Assertions are deliberately range-based (score_range, recommendation_in), never exact-match,
since LLM output is inherently non-deterministic — this is a screening signal, not a pass/fail
grading rubric."""

import pytest

from golden import load_golden, submit_golden_transcript

GOLDEN_NAMES = ["strong_candidate", "weak_candidate", "vague_generic_candidate"]


@pytest.mark.parametrize("golden_name", GOLDEN_NAMES)
def test_scorecard_matches_expected_outcome(employer_client, invite_factory, golden_name):
    golden = load_golden(golden_name)
    scorecard = submit_golden_transcript(employer_client, invite_factory, golden)

    score = scorecard["overall_score"]
    recommendation = scorecard["recommendation"]
    expected = golden["expected"]

    assert expected["score_range"][0] <= score <= expected["score_range"][1], (
        f"{golden_name}: overall_score {score} outside expected range {expected['score_range']}. "
        f"Full scorecard: {scorecard}"
    )
    assert recommendation in expected["recommendation_in"], (
        f"{golden_name}: recommendation '{recommendation}' not in expected {expected['recommendation_in']}. "
        f"Full scorecard: {scorecard}"
    )
    # Per-question notes and competency scores should never come back empty for a real transcript —
    # an empty list here would mean the model didn't actually engage with the transcript content.
    assert len(scorecard["per_question_notes"]) >= 1
    assert len(scorecard["competency_scores"]) >= 1


def test_recommendation_and_score_agree(employer_client, invite_factory):
    """Cross-field sanity check: a "Strong Match" shouldn't come with a low score, and a "Not
    Recommended" shouldn't come with a high one — catches the model's own fields disagreeing
    with each other, independent of whether either individually looks "right"."""
    for golden_name in GOLDEN_NAMES:
        golden = load_golden(golden_name)
        scorecard = submit_golden_transcript(employer_client, invite_factory, golden)
        score = scorecard["overall_score"]
        recommendation = scorecard["recommendation"]

        if recommendation == "Strong Match":
            assert score >= 70, f"{golden_name}: 'Strong Match' but score is only {score}"
        elif recommendation == "Not Recommended":
            assert score <= 45, f"{golden_name}: 'Not Recommended' but score is {score}"
