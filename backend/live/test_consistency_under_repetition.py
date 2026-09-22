"""Does the same transcript get a wildly different score depending on nothing but luck? Scores
the same golden transcript multiple times (each through a fresh invite, since submission is
one-time-per-invite) and checks the results cluster together — flags real scoring-pipeline
instability, as opposed to expected minor LLM-to-LLM variance."""

import statistics

from golden import load_golden, submit_golden_transcript

REPEATS = 5
MAX_SCORE_STDEV = 15  # on the 0-100 scale — tolerant of normal variance, not exact-match


def test_same_transcript_scores_consistently(employer_client, invite_factory):
    golden = load_golden("strong_candidate")
    scores = []
    recommendations = []
    for _ in range(REPEATS):
        scorecard = submit_golden_transcript(employer_client, invite_factory, golden)
        scores.append(scorecard["overall_score"])
        recommendations.append(scorecard["recommendation"])

    stdev = statistics.stdev(scores)
    assert stdev <= MAX_SCORE_STDEV, (
        f"Score spread too wide across {REPEATS} runs of the same transcript: {scores} "
        f"(stdev={stdev:.1f}, max allowed={MAX_SCORE_STDEV}). This flags scoring instability, "
        f"not necessarily a wrong score on any single run."
    )

    most_common_recommendation, count = statistics.mode(recommendations), recommendations.count(statistics.mode(recommendations))
    assert count >= (REPEATS // 2) + 1, (
        f"No clear majority recommendation across {REPEATS} runs: {recommendations} "
        f"(most common was '{most_common_recommendation}' with only {count}/{REPEATS})"
    )
