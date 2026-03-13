'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useLocale } from '@/context/LocaleContext';

import type {
  PlanInfo,
  UsageDimension,
  UsageDimensionSummary,
} from '@/types/core/Billing';

/**
 * Displays usage across all billing dimensions with progress bars.
 * Shows a credit summary card comparing estimated cost to total free credit.
 *
 * @param props - Component props.
 * @param props.usage - Array of usage dimension summaries.
 * @param props.plan - Current plan info (used for credit display).
 */
const BillingUsageDashboard = ({
  usage,
  plan,
}: {
  usage: UsageDimensionSummary[] | undefined;
  plan: PlanInfo | undefined;
}) => {
  const { dict, locale } = useLocale();

  const dimensionLabels: Record<UsageDimension, string> = {
    storage: dict.workspace.billingDimensionStorage,
    workflow_runs: dict.workspace.billingDimensionWorkflowRuns,
    ai_requests: dict.workspace.billingDimensionAiRequests,
    api_requests: dict.workspace.billingDimensionApiRequests,
    data_transfer: dict.workspace.billingDimensionDataTransfer,
    seats: dict.workspace.billingDimensionSeats,
  };

  if (!usage || usage.length === 0) {
    return null;
  }

  const totalCredit = plan?.total_credit ?? 0;
  const creditPerMeter = plan?.credit_per_meter ?? 0;

  // Calculate estimated cost across all dimensions
  const estimatedCost = usage.reduce(
    (sum, item) => sum + item.current_usage * item.rate_per_unit,
    0
  );
  const overage = Math.max(estimatedCost - totalCredit, 0);
  const creditPercentage =
    totalCredit > 0
      ? Math.min((estimatedCost / totalCredit) * 100, 100)
      : estimatedCost > 0
        ? 100
        : 0;
  const isOverCredit = estimatedCost > totalCredit;

  return (
    <div>
      {plan?.current_period_start && plan?.current_period_end && (
        <p className='mt-1 mb-2 text-sm text-muted-foreground'>
          {formatPeriodDate(plan.current_period_start, locale)}
          {' – '}
          {formatPeriodDate(plan.current_period_end, locale)}
          {' · '}
          {dict.workspace.billingLimitsResetIn.replace(
            '{n}',
            String(daysUntil(plan.current_period_end))
          )}
        </p>
      )}
      <div className='flex flex-col gap-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm font-medium'>
              {dict.workspace.billingIncludedCredit}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-baseline gap-1'>
              <span className='text-2xl font-bold'>
                {estimatedCost.toFixed(2)} €
              </span>
              <span className='text-sm text-muted-foreground'>
                / {totalCredit.toFixed(2)} € {dict.workspace.billingIncluded}
              </span>
            </div>
            <p className='mt-1 text-xs text-muted-foreground'>
              {dict.workspace.billingCreditPerMeter}:{' '}
              {creditPerMeter.toFixed(2)} €
            </p>
            <div
              className='
                mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary
              '
            >
              <div
                className={`
                  h-full rounded-full transition-all
                  ${isOverCredit ? 'bg-destructive' : 'bg-primary'}
                `}
                style={{ width: `${creditPercentage}%` }}
              />
            </div>
            {isOverCredit && (
              <p className='mt-1 text-xs text-destructive'>
                {dict.workspace.billingOverage}: {overage.toFixed(2)} €
              </p>
            )}
          </CardContent>
        </Card>
        <div
          className='
            grid grid-cols-1 gap-4
            md:grid-cols-2
            lg:grid-cols-3
          '
        >
          {usage.map((item) => {
            const percentage =
              item.limit != null && item.limit > 0
                ? Math.min((item.current_usage / item.limit) * 100, 100)
                : 0;
            const colorClass =
              percentage > 90
                ? 'bg-destructive'
                : percentage > 70
                  ? 'bg-yellow-500'
                  : 'bg-primary';

            return (
              <Card key={item.dimension}>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    {dimensionLabels[item.dimension] ?? item.dimension}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='flex items-baseline gap-1'>
                    <span className='text-2xl font-bold'>
                      {formatUsageNumber(item.current_usage)}
                    </span>
                    {item.limit != null && (
                      <span className='text-sm text-muted-foreground'>
                        / {formatUsageNumber(item.limit)} {item.unit}
                      </span>
                    )}
                    {item.limit == null && (
                      <span className='text-sm text-muted-foreground'>
                        {item.unit}
                      </span>
                    )}
                  </div>
                  {item.limit != null && (
                    <div
                      className='
                        mt-2 h-2 w-full overflow-hidden rounded-full
                        bg-secondary
                      '
                    >
                      <div
                        className={`
                          h-full rounded-full transition-all
                          ${colorClass}
                        `}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {item.rate_per_unit > 0 &&
                      `${item.rate_per_unit.toFixed(3)} € / ${item.unit}`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * Formats a usage number for display.
 *
 * @param value - The numeric value to format.
 * @returns A formatted string.
 */
function formatUsageNumber(value: number): string {
  if (value >= 999_950) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

/**
 * Formats a billing period date for display (e.g. "Mar 13, 2026").
 *
 * @param iso - ISO date string.
 * @param locale - BCP 47 locale code.
 * @returns Formatted date string.
 */
function formatPeriodDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculates the number of whole days from now until the given ISO date.
 *
 * @param iso - ISO date string.
 * @returns Number of days remaining (minimum 0).
 */
function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export default BillingUsageDashboard;
