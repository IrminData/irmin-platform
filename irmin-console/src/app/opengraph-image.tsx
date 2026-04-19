import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Irmin';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Static brand card served at `/opengraph-image` and auto-injected as
 * `og:image` on every route that doesn't override it.
 *
 * DESIGN.md calls for a single static card on all authenticated (noindex)
 * routes — a shared brand surface, not per-workspace previews that would
 * leak workspace names into Slack / iMessage threads when a link is pasted.
 *
 * Placeholder composition: Irmin wordmark on the dark theme background
 * (HSL(197 94% 4%) ≈ #010e14), with the Irmin Blue / Green accent mark.
 * Swap for the final brand asset when design delivers it — Next.js will
 * pick up the change on next build.
 */
export default async function OGImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '80px',
        background:
          'radial-gradient(ellipse at 20% 0%, hsl(197 94% 14%) 0%, hsl(197 94% 4%) 60%)',
        color: 'hsl(0 0% 98%)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background:
              'linear-gradient(135deg, hsl(197 94% 55%), hsl(137 52% 50%))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'hsl(197 94% 4%)',
            fontSize: 36,
            fontWeight: 700,
          }}
        >
          I
        </div>
        <div
          style={{ fontSize: 40, fontWeight: 600, letterSpacing: '-0.01em' }}
        >
          Irmin
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            fontSize: 76,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            maxWidth: 900,
          }}
        >
          The data platform for engineering teams.
        </div>
        <div
          style={{
            fontSize: 28,
            color: 'hsl(197 20% 68%)',
            letterSpacing: '-0.01em',
          }}
        >
          Versioned data · Workflows · AI-native
        </div>
      </div>
    </div>,
    { ...size }
  );
}
