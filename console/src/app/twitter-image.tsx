// Use the Open Graph card as the Twitter Card.
//
// Next.js treats `twitter-image.*` as a separate file convention and will not
// fall back to `opengraph-image` automatically, so this file exists to point
// both entries at the same renderer and avoid visual drift between the two
// previews.
//
// Turbopack parses the route-segment config exports (`runtime`, `alt`, `size`,
// `contentType`) statically and only accepts literal declarations — re-exports
// from another file are rejected. We therefore redeclare each config value
// here and only import the runtime renderer.
import OGImage from './opengraph-image';

export const runtime = 'edge';
export const alt = 'Irmin';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default OGImage;
