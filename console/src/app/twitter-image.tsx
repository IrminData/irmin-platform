// Use the Open Graph card as the Twitter Card.
//
// Next.js treats `twitter-image.*` as a separate file convention and will not
// fall back to `opengraph-image` automatically, so this file exists to point
// both entries at the same renderer and avoid visual drift between the two
// previews.
//
// Turbopack parses metadata exports (`alt`, `size`, `contentType`) statically
// and only accepts literal declarations. Redeclare them here and share only
// the renderer so both cards stay visually identical.
import OGImage from './opengraph-image';

export const alt = 'Irmin — the data platform for engineering teams';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default OGImage;
