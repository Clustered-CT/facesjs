import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const src = path.join(root, "svgs", "faces_descriptions.json");
const destDir = path.join(root, "build");
const dest = path.join(destDir, "faces_descriptions.json");

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(src, dest);
console.log(`Copied faces_descriptions.json to ${dest}`);
