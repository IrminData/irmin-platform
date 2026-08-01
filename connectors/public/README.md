# Connector Logos

250x250 PNG logos for active Irmin connectors.

## How these were created

1. Each logo is an SVG (250x250 viewBox) with a rounded rectangle background (rx=20) in the connector's brand color, and a white icon or text abbreviation centered on top.

2. SVGs were converted to 250x250 PNGs using [sharp](https://sharp.pixelplumbing.com/) via a Node.js script:
   ```js
   import sharp from 'sharp';
   await sharp(Buffer.from(svgString)).resize(250, 250).png().toFile(outputPath);
   ```

3. Brand colors were sourced from each connector's official branding guidelines.

## Naming convention

Files are named `{connector-slug}.png`, matching the slug used in connector configs. The Go connector configs reference these as `LogoURL: "/public/{slug}.png"`.

## Adding a new logo

When adding a new connector, follow the same pattern: create a 250x250 SVG with a solid rounded-rect background and a centered icon, then convert to PNG with sharp.
