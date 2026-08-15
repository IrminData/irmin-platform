/* eslint-disable import-x/no-unused-modules -- Node test entrypoint. */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EVALUATION_CANDIDATES } from '../inference/profiles';
import { type CandidateMetrics, selectPromotedCandidate } from './promotion';

const baseline: CandidateMetrics = {
  model: 'anthropic/claude-sonnet-4.6',
  weightedTaskSuccess: 90,
  safetyRegression: false,
  medianCost: 10,
  p95LatencyMs: 1_000,
};

describe('model promotion gate', () => {
  it('keeps the approved fixed candidate matrix', () => {
    assert.deepEqual(EVALUATION_CANDIDATES.assistant, [
      'openai/gpt-5.6-terra',
      'anthropic/claude-opus-4.8',
      'anthropic/claude-sonnet-4.6',
      'google/gemini-3.7-flash',
    ]);
    assert.deepEqual(EVALUATION_CANDIDATES.query, [
      'openai/gpt-5.6-sol',
      'openai/gpt-5.6-terra',
      'anthropic/claude-opus-4.8',
      'anthropic/claude-sonnet-4.6',
    ]);
    assert.deepEqual(EVALUATION_CANDIDATES.title, EVALUATION_CANDIDATES.hyde);
  });

  it('rejects safety, quality, cost, and latency regressions', () => {
    const candidates: CandidateMetrics[] = [
      { ...baseline, model: 'unsafe', safetyRegression: true, medianCost: 4 },
      {
        ...baseline,
        model: 'low-quality',
        weightedTaskSuccess: 87,
        medianCost: 4,
      },
      { ...baseline, model: 'expensive', medianCost: 6.1 },
      { ...baseline, model: 'slow', medianCost: 4, p95LatencyMs: 1_201 },
    ];
    assert.equal(selectPromotedCandidate(baseline, candidates), undefined);
  });

  it('chooses lower cost when success is within one point', () => {
    const promoted = selectPromotedCandidate(baseline, [
      {
        ...baseline,
        model: 'higher-score',
        weightedTaskSuccess: 90,
        medianCost: 5,
      },
      {
        ...baseline,
        model: 'lower-cost',
        weightedTaskSuccess: 89.2,
        medianCost: 4,
      },
    ]);
    assert.equal(promoted?.model, 'lower-cost');
  });

  it('chooses higher success when candidates differ by more than one point', () => {
    const promoted = selectPromotedCandidate(baseline, [
      {
        ...baseline,
        model: 'higher-score',
        weightedTaskSuccess: 90,
        medianCost: 5,
      },
      {
        ...baseline,
        model: 'lower-cost',
        weightedTaskSuccess: 88.5,
        medianCost: 3,
      },
    ]);
    assert.equal(promoted?.model, 'higher-score');
  });
});
