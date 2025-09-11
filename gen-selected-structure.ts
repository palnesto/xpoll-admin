import { readdirSync, statSync, writeFileSync } from "fs";
import { join, relative } from "path";

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, "src");
const OUTPUT_FILE = join(ROOT, "fStructure.txt");

/**
 * 👇 Edit this array to include the relative paths you want
 * Examples:
 *   ["src/components", "src/pages/Home.tsx", "src/utils"]
 *   ["src"]  // full src folder (default behavior)
 */
const TARGETS: string[] = ["src/pages/polls", "src/pages/trials"]; // change this as needed

function walk(dir: string, prefix = ""): string[] {
  const entries = readdirSync(dir).sort((a, b) => a.localeCompare(b));
  const lines: string[] = [];

  entries.forEach((entry, index) => {
    const fullPath = join(dir, entry);
    const isDir = statSync(fullPath).isDirectory();
    const connector = index === entries.length - 1 ? "└── " : "├── ";

    lines.push(prefix + connector + entry);

    if (isDir) {
      const newPrefix =
        prefix + (index === entries.length - 1 ? "    " : "│   ");
      lines.push(...walk(fullPath, newPrefix));
    }
  });

  return lines;
}

function structureForPath(targetRel: string): string[] {
  const abs = join(ROOT, targetRel);

  try {
    const st = statSync(abs);

    if (st.isDirectory()) {
      return [targetRel, ...walk(abs)];
    } else {
      return [targetRel];
    }
  } catch {
    return [`⚠️ Not found: ${targetRel}`];
  }
}

function main() {
  if (TARGETS.length === 0) {
    console.error("❌ No targets specified in TARGETS array.");
    process.exit(1);
  }

  const allLines: string[] = [];
  TARGETS.forEach((t) => {
    allLines.push(...structureForPath(t), ""); // blank line between blocks
  });

  while (allLines.length && allLines[allLines.length - 1] === "") {
    allLines.pop();
  }

  writeFileSync(OUTPUT_FILE, allLines.join("\n"), "utf8");
  console.log(`✅ Structure saved to ${OUTPUT_FILE}`);
}

main();
