import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectDocs } from "./catalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXPORT_ROOT = path.join(ROOT, "Maguito Ascendido 2026-11-06");
const WORLD_ROOT = path.join(EXPORT_ROOT, "world");
const WEB_ROOT = __dirname;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".jfif": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".md": "text/plain; charset=utf-8",
};

function inside(root, rel) {
  const full = path.resolve(root, rel);
  const diff = path.relative(root, full);
  if (diff.startsWith("..") || path.isAbsolute(diff)) return null;
  return full;
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendFile(res, file) {
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) {
      send(res, 404, "not found");
      return;
    }
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
    fs.createReadStream(file).pipe(res);
  });
}

async function docsPayload() {
  return JSON.stringify(await collectDocs(WORLD_ROOT));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === "/api/docs" || pathname === "/docs.json") {
    try {
      send(res, 200, await docsPayload(), "application/json; charset=utf-8");
    } catch (error) {
      send(res, 500, error.message);
    }
    return;
  }

  const exportPrefix = `/${path.basename(EXPORT_ROOT)}/`;
  if (pathname.startsWith(exportPrefix)) {
    const file = inside(EXPORT_ROOT, pathname.slice(exportPrefix.length));
    if (!file) {
      send(res, 403, "forbidden");
      return;
    }
    sendFile(res, file);
    return;
  }

  if (pathname.startsWith("/export/")) {
    const file = inside(EXPORT_ROOT, pathname.slice("/export/".length));
    if (!file) {
      send(res, 403, "forbidden");
      return;
    }
    sendFile(res, file);
    return;
  }

  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = inside(WEB_ROOT, rel);
  if (!file) {
    send(res, 403, "forbidden");
    return;
  }
  sendFile(res, file);
});

const port = Number(process.env.PORT) || 4173;
server.listen(port, "127.0.0.1", () => {
  console.log(`Portal listo en http://127.0.0.1:${port}`);
});
