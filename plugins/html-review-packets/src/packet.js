export function validatePacket(packet) {
  if (!packet || typeof packet !== "object") {
    throw new Error("Packet must be a JSON object.");
  }
  if (packet.schema !== "html_review_packet.v1") {
    throw new Error("Unsupported packet schema.");
  }
  if (!Array.isArray(packet.comments)) {
    throw new Error("Packet comments must be an array.");
  }
  for (const [index, comment] of packet.comments.entries()) {
    if (!comment || typeof comment !== "object") throw new Error(`Comment ${index + 1} must be an object.`);
    if (!comment.comment && !comment.proposedReplacement) {
      throw new Error(`Comment ${index + 1} needs comment text or a proposed replacement.`);
    }
  }
  return packet;
}

export function packetToMarkdown(packet) {
  validatePacket(packet);
  const document = packet.document || {};
  const lines = [
    "# HTML Review Packet",
    "",
    `Created: ${packet.createdAt || "unknown"}`,
    `Title: ${document.title || "Untitled"}`,
    `File: ${document.file || "not provided"}`,
    `Generator: ${document.generator || "not provided"}`,
    `URL: ${document.url || "not provided"}`,
    "",
    "## Agent Task",
    "",
    "Review all comments together, checkpoint the source, amend only the relevant sections, regenerate the HTML if there is a generator, and report the diff.",
    "",
    "## Comments"
  ];

  packet.comments.forEach((comment, index) => {
    lines.push(
      "",
      `### ${index + 1}. ${comment.section || "Section"}`,
      "",
      "**Selected text**",
      "",
      fence(comment.selectedText || ""),
      "",
      "**Reviewer comment**",
      "",
      comment.comment || "",
      ""
    );
    if (comment.proposedReplacement) {
      lines.push("**Proposed replacement**", "", fence(comment.proposedReplacement), "");
    }
    if (comment.nearbyContext) {
      lines.push("**Nearby context**", "", fence(comment.nearbyContext), "");
    }
  });

  lines.push("", "## Raw Packet", "", "```json", JSON.stringify(packet, null, 2), "```");
  return lines.join("\n");
}

export function packetSlug(packet) {
  const title = packet?.document?.title || "html-review";
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "html-review";
}

export function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function fence(value) {
  return ["```", String(value || ""), "```"].join("\n");
}

