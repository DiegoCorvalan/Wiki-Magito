import fsp from "node:fs/promises";
import path from "node:path";

export async function collectDocs(worldRoot) {
  const files = await walk(worldRoot);
  const docs = [];
  for (const file of files) {
    const rel = path.relative(worldRoot, file).split(path.sep).join("/");
    docs.push({ rel, markdown: await fsp.readFile(file, "utf8") });
  }
  docs.sort((a, b) => a.rel.localeCompare(b.rel, "es"));
  return docs;
}

async function walk(dir) {
  const out = [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}
