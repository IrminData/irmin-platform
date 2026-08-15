import { ImageResponse } from 'next/og';

/* eslint-disable import-x/no-nodejs-modules -- Metadata generation reads a bundled brand asset at build time. */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/* eslint-enable import-x/no-nodejs-modules */

export const alt = 'Irmin — the data platform for engineering teams';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Static Almanac brand card served at `/opengraph-image` and shared by
 * routes that do not provide a more specific preview.
 */
export default async function OGImage() {
  const lockup = await readFile(
    join(process.cwd(), 'public', 'brand', 'lockup-horizontal-dark.svg'),
    'base64'
  );
  const lockupSrc = `data:image/svg+xml;base64,${lockup}`;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '64px 72px 56px',
        background: '#0f1212',
        color: '#efe7db',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTop: '2px solid #c6f432',
          paddingTop: 28,
        }}
      >
        <img
          alt='Irmin'
          src={lockupSrc}
          width={520}
          height={171}
          style={{ objectFit: 'contain' }}
        />
        <div
          style={{
            display: 'flex',
            fontFamily: 'monospace',
            fontSize: 18,
            letterSpacing: '0.16em',
            color: '#c6f432',
          }}
        >
          DATA INFRASTRUCTURE
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            maxWidth: 940,
            fontSize: 70,
            fontWeight: 600,
            letterSpacing: '-0.035em',
            lineHeight: 1.02,
          }}
        >
          The data platform for engineering teams.
        </div>
        <div
          style={{
            display: 'flex',
            width: 24,
            height: 24,
            background: '#c6f432',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          borderTop: '1px solid rgba(239, 231, 219, 0.22)',
          paddingTop: 20,
          fontFamily: 'monospace',
          fontSize: 18,
          letterSpacing: '0.08em',
          color: 'rgba(239, 231, 219, 0.72)',
        }}
      >
        <div style={{ display: 'flex' }}>
          VERSIONED DATA / WORKFLOWS / AI-NATIVE
        </div>
        <div style={{ display: 'flex' }}>IRMIN.DATA</div>
      </div>
    </div>,
    { ...size }
  );
}
