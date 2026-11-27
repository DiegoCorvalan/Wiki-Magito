import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectDocs } from "./catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXPORT_ROOT = path.join(ROOT, "Maguito Ascendido 2026-11-06");
const WORLD_ROOT = path.join(EXPORT_ROOT, "world");
const DIST = path.join(ROOT, "dist");

const SITE_FILES = ["index.html", "styles.css", "app.js"];

await fsp.rm(DIST, { recursive: true, force: true });
await fsp.mkdir(DIST, { recursive: true });

for (const name of SITE_FILES) {
  await fsp.copyFile(path.join(__dirname, name), path.join(DIST, name));
}

const docs = await collectDocs(WORLD_ROOT);
const docsJson = JSON.stringify(docs);
await fsp.writeFile(path.join(DIST, "docs.json"), docsJson);
await fsp.writeFile(path.join(__dirname, "docs.json"), docsJson);
await fsp.writeFile(path.join(DIST, ".nojekyll"), "");

await fsp.cp(EXPORT_ROOT, path.join(DIST, "export"), {
  recursive: true,
  filter(src) {
    return path.extname(src).toLowerCase() !== ".vvd";
  },
});

console.log(`Sitio listo en dist/ (${docs.length} fichas).`);
