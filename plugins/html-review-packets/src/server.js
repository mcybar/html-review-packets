import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
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

      if (request.method === "GET" && url.pathname === "/api/review-status") {
        await handleStatusRead(url, response, safeRoot);
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/review-status") {
        await handleStatusUpdate(request, url, response, safeRoot);
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
  const reviewId = `${stamp}-${slug}`;
  const outDir = join(root, ".html-review-packets", "packets");
  const statusDir = join(root, ".html-review-packets", "status");
  await mkdir(outDir, { recursive: true });
  await mkdir(statusDir, { recursive: true });
  const jsonPath = join(outDir, `${reviewId}.json`);
  const markdownPath = join(outDir, `${reviewId}.md`);
  const statusPath = join(statusDir, `${reviewId}.json`);
  const now = new Date().toISOString();
  const status = initialProgressStatus({
    id: reviewId,
    now,
    reviewPath: relative(root, jsonPath),
    markdownPath: relative(root, markdownPath),
    statusPath: relative(root, statusPath)
  });
  await writeFile(jsonPath, JSON.stringify(packet, null, 2) + "\n", "utf8");
  await writeFile(markdownPath, packetToMarkdown(packet, {
    reviewId,
    statusPath: relative(root, statusPath),
    statusUrl: `/api/review-status?id=${encodeURIComponent(reviewId)}`
  }) + "\n", "utf8");
  await writeFile(statusPath, JSON.stringify(status, null, 2) + "\n", "utf8");
  sendJson(response, 200, {
    ok: true,
    reviewId,
    reviewPath: status.reviewPath,
    markdownPath: status.markdownPath,
    statusPath: status.statusPath,
    statusUrl: `/api/review-status?id=${encodeURIComponent(reviewId)}`,
    progress: status,
    agentStarted: false
  });
}

async function handleStatusRead(url, response, root) {
  const id = safeStatusId(url.searchParams.get("id"));
  if (!id) {
    sendJson(response, 400, { ok: false, error: "Missing status id." });
    return;
  }
  const statusPath = join(root, ".html-review-packets", "status", `${id}.json`);
  assertInsideRoot(statusPath, root);
  try {
    const status = JSON.parse(await readFile(statusPath, "utf8"));
    sendJson(response, 200, status);
  } catch (_error) {
    sendJson(response, 404, { ok: false, id, status: "unknown", message: "No progress status found for this review packet." });
  }
}

async function handleStatusUpdate(request, url, response, root) {
  const id = safeStatusId(url.searchParams.get("id"));
  if (!id) {
    sendJson(response, 400, { ok: false, error: "Missing status id." });
    return;
  }
  const statusPath = join(root, ".html-review-packets", "status", `${id}.json`);
  assertInsideRoot(statusPath, root);
  const patch = JSON.parse(await readRequestBody(request, MAX_PACKET_BYTES));
  const existing = JSON.parse(await readFile(statusPath, "utf8"));
  const updated = mergeProgressStatus(existing, patch);
  await writeFile(statusPath, JSON.stringify(updated, null, 2) + "\n", "utf8");
  sendJson(response, 200, updated);
}

function initialProgressStatus({ id, now, reviewPath, markdownPath, statusPath }) {
  return {
    schema: "html_review_progress.v1",
    id,
    status: "waiting_for_agent",
    phase: "submitted",
    percent: 20,
    message: "Review packet saved. Waiting for an agent to apply it.",
    createdAt: now,
    updatedAt: now,
    reviewPath,
    markdownPath,
    statusPath,
    terminal: false,
    steps: [
      { key: "submitted", label: "Packet submitted", status: "done", at: now },
      { key: "checkpoint", label: "Create version checkpoint", status: "pending" },
      { key: "apply", label: "Apply requested amendments", status: "pending" },
      { key: "regenerate", label: "Regenerate HTML", status: "pending" },
      { key: "verify", label: "Verify and summarize", status: "pending" }
    ],
    events: [
      { at: now, status: "waiting_for_agent", message: "Review packet saved by bridge." }
    ]
  };
}

function mergeProgressStatus(existing, patch) {
  const now = new Date().toISOString();
  const next = {
    ...existing,
    ...pickProgressFields(patch),
    updatedAt: now
  };
  if (patch.step) next.steps = updateStep(next.steps || [], patch.step, now);
  if (patch.steps && Array.isArray(patch.steps)) next.steps = patch.steps;
  next.terminal = Boolean(patch.terminal ?? isTerminalStatus(next.status));
  next.events = Array.isArray(existing.events) ? existing.events.slice(-50) : [];
  next.events.push({
    at: now,
    status: next.status,
    phase: next.phase,
    message: next.message || ""
  });
  return next;
}

function pickProgressFields(patch) {
  const allowed = {};
  for (const key of ["status", "phase", "percent", "message", "reviewPath", "markdownPath", "statusPath", "summaryPath", "error"]) {
    if (patch[key] !== undefined) allowed[key] = patch[key];
  }
  return allowed;
}

function updateStep(steps, step, now) {
  const key = step.key || step;
  const index = steps.findIndex((item) => item.key === key);
  const nextStep = typeof step === "string" ? { key, status: "done" } : step;
  const normalized = {
    ...nextStep,
    key,
    label: nextStep.label || steps[index]?.label || key,
    status: nextStep.status || "done"
  };
  if (["done", "failed", "running"].includes(normalized.status)) normalized.at = normalized.at || now;
  if (index >= 0) return steps.map((item, itemIndex) => itemIndex === index ? { ...item, ...normalized } : item);
  return [...steps, normalized];
}

function isTerminalStatus(status) {
  return ["completed", "failed", "cancelled", "needs_manual_apply"].includes(status);
}

function safeStatusId(id) {
  const value = String(id || "");
  return /^[a-zA-Z0-9._-]{1,160}$/.test(value) ? value : "";
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
