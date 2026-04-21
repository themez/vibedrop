import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { zipSync } from "fflate";

const IGNORE = new Set([
  "node_modules", ".git", ".DS_Store", ".next", ".turbo", ".cache",
  ".wrangler", "dist-ssr", ".vercel", ".netlify",
]);

export async function packDir(root: string): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  await walk(root, root, files);
  if (Object.keys(files).length === 0) {
    throw new Error(`no files found under ${root}`);
  }
  return zipSync(files, { level: 6 });
}

async function walk(
  dir: string,
  root: string,
  out: Record<string, Uint8Array>,
): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (IGNORE.has(e.name)) continue;
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      await walk(abs, root, out);
    } else if (e.isFile()) {
      const s = await stat(abs);
      if (s.size > 20 * 1024 * 1024) continue;
      const rel = relative(root, abs).split(sep).join("/");
      out[rel] = await readFile(abs);
    }
  }
}
