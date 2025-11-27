import fs from "node:fs";
import path from "node:path";

const svgRoot = path.join(import.meta.dirname, "..", "svgs");
const outputPath = path.join(svgRoot, "catalog.svg");

const padding = 24;
const cols = 5;
const thumbWidth = 180; // scaled preview of each part
const thumbHeight = 240;
const labelHeight = 18;
const colWidth = 200;
const blockHeight = thumbHeight + labelHeight + 12;
const categoryGap = 32;
const titleFont = 'font-family="Arial, sans-serif"';

const stripProlog = (svg) =>
  svg
    .replace(/<\?xml[^>]*?>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!DOCTYPE[^>]*?>/gi, "");

const sanitize = (svg) =>
  // Drop metadata blocks (often include rdf:* without declared namespace)
  svg
    .replace(/<metadata[\s\S]*?<\/metadata>/gi, "")
    // Drop Inkscape/sodipodi namedview blocks
    .replace(/<\s*(?:sodipodi|inkscape):[^>]*?\/?>[\s\S]*?<\/\s*(?:sodipodi|inkscape):[^>]*?>/gi, "")
    .replace(/<\s*(?:sodipodi|inkscape):[^>]*?\/?>/gi, "")
    // Remove inkscape:/sodipodi: attributes
    .replace(/\s+(?:inkscape|sodipodi):[^=\s]+="[^"]*"/gi, "");

const extractViewBox = (svg) => {
  const match = svg.match(/viewBox="([^"]+)"/i);
  if (!match) {
    return { minX: 0, minY: 0, width: 400, height: 600 };
  }
  const [minX, minY, width, height] = match[1]
    .split(/\s+/)
    .map((n) => parseFloat(n));
  return { minX, minY, width, height };
};

const extractInner = (svg) =>
  svg.replace(/<svg[^>]*>/i, "").replace(/<\/svg>/i, "");

const tryWritePng = async (svgPath, pngPath) => {
  try {
    const { default: sharp } = await import("sharp");
    const svgBuffer = fs.readFileSync(svgPath);
    // Downscale to avoid pixel limit errors and ensure portability
    await sharp(svgBuffer, { density: 200, limitInputPixels: false })
      .resize({ width: 2000, height: null, fit: "contain", background: "white" })
      .png()
      .toFile(pngPath);
    console.log(`Wrote ${pngPath}`);
  } catch (error) {
    console.warn(
      `Skipping PNG output for ${pngPath}. Install sharp to enable PNG export (pnpm add -D sharp).`,
    );
  }
};

const main = async () => {
  const categories = fs
    .readdirSync(svgRoot)
    .filter(
      (name) =>
        !name.startsWith(".") &&
        fs.statSync(path.join(svgRoot, name)).isDirectory(),
    )
    .sort();

  let y = padding;
  const chunks = [];

  for (const category of categories) {
    const dir = path.join(svgRoot, category);
    const files = fs
      .readdirSync(dir)
      .filter((file) => file.endsWith(".svg"))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    chunks.push(
      `<text x="${padding}" y="${y}" ${titleFont} font-size="18" font-weight="bold">${category}</text>`,
    );
    y += 22;

    files.forEach((file, idx) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const clean = sanitize(stripProlog(raw));
      const vb = extractViewBox(raw);
      const inner = extractInner(clean);
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = padding + col * colWidth;
      const yOffset = y + row * blockHeight;
      const id = path.basename(file, ".svg");
      const innerW = thumbWidth - 16;
      const innerH = thumbHeight - 32;
      const scale = Math.min(innerW / vb.width, innerH / vb.height);
      const tx = 8 + (innerW - vb.width * scale) / 2 - vb.minX * scale;
      const ty = 8 + (innerH - vb.height * scale) / 2 - vb.minY * scale;

      chunks.push(
        `<g transform="translate(${x} ${yOffset})">` +
          `<rect width="${thumbWidth}" height="${thumbHeight}" rx="8" ry="8" fill="#f7f7f7" stroke="#ddd"/>` +
          `<g transform="translate(${tx} ${ty}) scale(${scale})">` +
          inner +
          `</g>` +
          `<text x="${thumbWidth / 2}" y="${thumbHeight - 6}" ${titleFont} font-size="14" text-anchor="middle" fill="#333">${id}</text>` +
        `</g>`,
      );
    });

    const rows = Math.ceil(files.length / cols);
    y += rows * blockHeight + categoryGap;
  }

  const width = padding * 2 + cols * colWidth;
  const height = y + padding;
  const output = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${chunks.join(
    "\n",
  )}\n</svg>\n`;

  fs.writeFileSync(outputPath, output, "utf8");
  console.log(`Wrote ${outputPath}`);

const pngPath = outputPath.replace(/\.svg$/i, ".png");
await tryWritePng(outputPath, pngPath);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
