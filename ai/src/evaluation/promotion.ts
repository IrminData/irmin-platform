export interface CandidateMetrics {
  model: string;
  weightedTaskSuccess: number;
  safetyRegression: boolean;
  medianCost: number;
  p95LatencyMs: number;
}

/** Apply the reviewed quality, safety, cost, and latency promotion gate. */
export function selectPromotedCandidate(
  baseline: CandidateMetrics,
  candidates: readonly CandidateMetrics[]
): CandidateMetrics | undefined {
  const qualifying = candidates
    .filter((candidate) => !candidate.safetyRegression)
    .filter(
      (candidate) =>
        candidate.weightedTaskSuccess >= baseline.weightedTaskSuccess - 2
    )
    .filter((candidate) => candidate.medianCost <= baseline.medianCost * 0.6)
    .filter(
      (candidate) => candidate.p95LatencyMs <= baseline.p95LatencyMs * 1.2
    )
    .sort((left, right) => {
      const successDifference =
        right.weightedTaskSuccess - left.weightedTaskSuccess;
      if (Math.abs(successDifference) > 1) return successDifference;
      return left.medianCost - right.medianCost;
    });

  return qualifying[0];
}
