import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = path.join(import.meta.dirname, "..");
const faceSrc = path.join(root, "src", "Face.tsx");
const faceOut = path.join(root, "build", "Face.js");

if (!fs.existsSync(faceOut)) {
  console.log("Face.js missing; compiling Face.tsx...");
  execSync(
    `npx babel "${faceSrc}" --extensions '.js,.jsx,.ts,.tsx' --out-file "${faceOut}"`,
    { stdio: "inherit", cwd: root },
  );
}
