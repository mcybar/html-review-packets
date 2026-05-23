import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, relative, resolve, sep } from "node:path";
import { packetSlug, packetToMarkdown, timestampForFile, validatePacket } from "./packet.js";

const MAX_PACKET_BYTES = 5 * 1024 * 1024;

export async function serveBridge({ root = process.cwd(), port = 8783, host = "127.0.0.1" } = {}) {
  const safeRoot = resolve(root);
  const server = createServer(async (request, response) => {
    try {
      setCors(response);
      if (request.method === "OPTIONS") {
        response.writeHead(204);
        response.end();
        return;
      }

      const url = new URL(request.url || "/", `http://${request.headers.host || `${host}:${port}`}`);
      if (request.method === "POST" && url.pathname === "/api/review-packet") {
        await handlePacket(request, response, safeRoot);
        return;
      }

      if (request.method === "GET") {
        await serveStatic(url.pathname, response, safeRoot);
        return;
      }

      sendJson(response, 405, { ok: false, error: "Method not allowed." });
    } catch (error) {
      sendJson(response, 500, { ok: false, error: error.message || String(error) });
    }
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, host, () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  console.log(`HTML Review Packets bridge listening at http://${host}:${actualPort}`);
  console.log(`Serving files from ${safeRoot}`);
  return server;
}

async function handlePacket(request, response, root) {
  const raw = await readRequestBody(request, MAX_PACKET_BYTES);
  const packet = validatePacket(JSON.parse(raw));
  const stamp = timestampForFile();
  const slug = packetSlug(packet);
  const outDir = join(root, ".html-review-packets", "packets");
  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, `${stamp}-${slug}.json`);
  const markdownPath = join(outDir, `${stamp}-${slug}.md`);
  await writeFile(jsonPath, JSON.stringify(packet, null, 2) + "\n", "utf8");
  await writeFile(markdownPath, packetToMarkdown(packet) + "\n", "utf8");
  sendJson(response, 200, {
    ok: true,
    reviewPath: relative(root, jsonPath),
    markdownPath: relative(root, markdownPath),
    agentStarted: false
  });
}

async function serveStatic(pathname, response, root) {
  const cleanPath = decodeURIComponent(pathname).replace(/^\/+/, "");
  let filePath = resolve(root, cleanPath || "index.html");
  assertInsideRoot(filePath, root);

  let info;
  try {
    info = await stat(filePath);
  } catch (_error) {
    if (!cleanPath) {
      sendHtml(response, 200, landingPage(root));
      return;
    }
    sendHtml(response, 404, "Not found");
    return;
  }

  if (info.isDirectory()) {
    filePath = join(filePath, "index.html");
    assertInsideRoot(filePath, root);
    try {
      info = await stat(filePath);
    } catch (_error) {
      sendHtml(response, 200, landingPage(root));
      return;
    }
  }

  response.writeHead(200, {
    "content-type": contentType(filePath),
    "content-length": info.size
  });
  createReadStream(filePath).pipe(response);
}

function readRequestBody(request, maxBytes) {
  return new Promise((resolveBody, rejectBody) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        rejectBody(new Error("Request body too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
    request.on("error", rejectBody);
  });
}

function assertInsideRoot(filePath, root) {
  const rel = relative(root, filePath);
  if (rel.startsWith("..") || rel === ".." || rel.includes(`..${sep}`)) {
    throw new Error("Path escapes server root.");
  }
}

function setCors(response) {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");
}

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function sendHtml(response, status, body) {
  response.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  response.end(body);
}

function contentType(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".html" || ext === ".htm") return "text/html; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function landingPage(root) {
  return [
    "<!doctype html>",
    "<meta charset=\"utf-8\">",
    "<title>HTML Review Packets</title>",
    "<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:48px auto;padding:0 20px;line-height:1.5;color:#171717}code{background:#f3f4f6;padding:2px 5px;border-radius:4px}</style>",
    "<h1>HTML Review Packets bridge</h1>",
    `<p>Serving files from <code>${escapeHtml(root)}</code>.</p>`,
    "<p>Open a generated <code>.review.html</code> file through this server, add comments, then submit the packet.</p>",
    `<p>Packets will be written to <code>${escapeHtml(join(root, ".html-review-packets", "packets"))}</code>.</p>`
  ].join("\n");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
