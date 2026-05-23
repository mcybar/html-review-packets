import test from "node:test";
import assert from "node:assert/strict";
import { packetSlug, packetToMarkdown, validatePacket } from "../src/packet.js";

const packet = {
  schema: "html_review_packet.v1",
  createdAt: "2026-05-23T00:00:00.000Z",
  document: {
    title: "Quarterly Ops Review",
    file: "/tmp/basic.html",
    generator: "",
    url: "http://127.0.0.1/basic.review.html"
  },
  comments: [
    {
      section: "Renewal Risk",
      selectedText: "lacks strong evidence",
      nearbyContext: "The renewal process is healthy but lacks strong evidence for the claim.",
      comment: "Make this more specific.",
      proposedReplacement: "needs two customer examples before this claim is credible"
    }
  ]
};

test("validates packet schema", () => {
  assert.equal(validatePacket(packet), packet);
  assert.throws(() => validatePacket({ schema: "wrong", comments: [] }), /Unsupported/);
});

test("renders markdown task", () => {
  const markdown = packetToMarkdown(packet);
  assert.match(markdown, /HTML Review Packet/);
  assert.match(markdown, /Make this more specific/);
  assert.match(markdown, /Raw Packet/);
});

test("creates stable packet slug", () => {
  assert.equal(packetSlug(packet), "quarterly-ops-review");
});

