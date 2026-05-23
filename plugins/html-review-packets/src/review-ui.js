export function renderReviewUi() {
  return `;(${reviewUiRuntime.toString()})();`;
}

function reviewUiRuntime() {
  const VERSION = "0.2.0";
  const DEFAULT_SELECTOR = [
    "[data-review-section]",
    "article",
    "section",
    "main p",
    "main li",
    "main blockquote",
    "main td",
    "main th",
    "main h1",
    "main h2",
    "main h3",
    "main h4",
    ".card",
    ".block",
    ".section",
    "body p",
    "body li"
  ].join(",");

  const config = readConfig();
  const selector = config.sectionSelector || DEFAULT_SELECTOR;
  const storageKey = config.storageKey || ("html-review-packets:" + location.href);
  const progressKey = storageKey + ":progress";
  const state = {
    range: null,
    target: null,
    selectedText: "",
    sectionPath: "",
    anchorX: 24,
    anchorY: 24,
    comments: loadComments(),
    progress: loadProgress(),
    progressTimer: null
  };

  const menu = document.createElement("div");
  menu.className = "hrp-menu";
  menu.innerHTML = [
    '<button type="button" data-hrp-action="comment">Add comment</button>',
    '<button type="button" data-hrp-action="edit">Suggest replacement</button>',
    '<button type="button" data-hrp-action="copy-selection">Copy selection</button>',
    '<button type="button" data-hrp-action="copy-packet">Copy packet</button>',
    '<button type="button" data-hrp-action="review">Review queue</button>',
    '<div class="hrp-hint">Select text, right-click, type the note, Enter saves. Shift+Enter adds a line.</div>'
  ].join("");

  const bubble = document.createElement("div");
  bubble.className = "hrp-bubble";
  bubble.innerHTML = [
    '<div class="hrp-bubble-head">',
    '  <div class="hrp-bubble-title">Comment</div>',
    '  <button type="button" class="hrp-close" data-hrp-action="close-bubble" aria-label="Close">x</button>',
    "</div>",
    '<div class="hrp-quote"></div>',
    '<textarea class="hrp-input" placeholder="Add a comment..."></textarea>',
    '<textarea class="hrp-replacement" placeholder="Optional replacement text..."></textarea>',
    '<div class="hrp-bubble-foot">',
    '  <div class="hrp-key-hint">Enter saves. Shift+Enter makes a new line.</div>',
    '  <div class="hrp-buttons">',
    '    <button type="button" class="hrp-button" data-hrp-action="copy-prompt">Copy prompt</button>',
    '    <button type="button" class="hrp-button hrp-primary" data-hrp-action="save-comment">Save</button>',
    "  </div>",
    "</div>"
  ].join("");

  const fab = document.createElement("button");
  fab.type = "button";
  fab.className = "hrp-fab";
  fab.dataset.hrpAction = "review";
  fab.innerHTML = 'Review <span class="hrp-count">0</span>';

  const panel = document.createElement("div");
  panel.className = "hrp-panel";
  panel.innerHTML = [
    '<div class="hrp-panel-head">',
    "  <strong>Review queue</strong>",
    '  <button type="button" class="hrp-close" data-hrp-action="close-panel" aria-label="Close">x</button>',
    "</div>",
    '<div class="hrp-panel-actions">',
    '  <button type="button" class="hrp-button hrp-primary" data-hrp-action="submit-packet">Submit packet</button>',
    '  <button type="button" class="hrp-button" data-hrp-action="copy-packet">Copy packet</button>',
    '  <button type="button" class="hrp-button" data-hrp-action="download-packet">Download JSON</button>',
    '  <button type="button" class="hrp-button" data-hrp-action="clear-comments">Clear</button>',
    "</div>",
    '<div class="hrp-progress" data-hrp-progress hidden>',
    '  <div class="hrp-progress-head">',
    '    <div>',
    '      <strong class="hrp-progress-title">Agent progress</strong>',
    '      <p class="hrp-progress-message"></p>',
    "    </div>",
    '    <button type="button" class="hrp-button" data-hrp-action="refresh-progress">Refresh</button>',
    "  </div>",
    '  <div class="hrp-progress-bar"><span></span></div>',
    '  <div class="hrp-progress-meta"></div>',
    '  <div class="hrp-progress-steps"></div>',
    "</div>",
    '<div class="hrp-list"></div>'
  ].join("");

  const toast = document.createElement("div");
  toast.className = "hrp-toast";

  document.body.append(menu, bubble, fab, panel, toast);

  const quoteEl = bubble.querySelector(".hrp-quote");
  const titleEl = bubble.querySelector(".hrp-bubble-title");
  const commentInput = bubble.querySelector(".hrp-input");
  const replacementInput = bubble.querySelector(".hrp-replacement");
  const listEl = panel.querySelector(".hrp-list");
  const progressEl = panel.querySelector("[data-hrp-progress]");

  restoreCommentMarks();
  renderComments();
  renderProgress();
  updateCount();
  if (state.progress && !state.progress.terminal) startProgressPolling();

  window.HTMLReviewPackets = {
    version: VERSION,
    getPacket: buildPacket,
    getProgress() {
      return state.progress;
    },
    clearComments,
    addCommentForTest(input) {
      const item = normalizeComment(input || {});
      state.comments.push(item);
      saveComments();
      return item;
    },
    setProgressForTest(progress) {
      setProgress(progress || null);
      return state.progress;
    }
  };

  document.addEventListener("contextmenu", (event) => {
    const info = selectionInfo(event);
    if (!info) return;
    event.preventDefault();
    Object.assign(state, info);
    highlightTarget(info.target);
    closeBubble();
    closePanel();
    menu.classList.add("is-open");
    positionFloating(menu, event.clientX, event.clientY, 320);
  });

  document.addEventListener("keydown", (event) => {
    if ((event.target === commentInput || event.target === replacementInput) && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      saveCurrentComment();
      return;
    }
    if (event.key === "Escape") {
      closeMenu();
      closeBubble();
      closePanel();
      highlightTarget(null);
    }
  });

  document.addEventListener("click", (event) => {
    const commentAction = event.target.closest("[data-hrp-comment-action]");
    if (commentAction) {
      const id = commentAction.dataset.hrpCommentId;
      const action = commentAction.dataset.hrpCommentAction;
      if (action === "focus") focusComment(id);
      if (action === "copy") copySingleComment(id);
      if (action === "delete") deleteComment(id);
      return;
    }

    const action = event.target.closest("[data-hrp-action]")?.dataset.hrpAction;
    if (action) {
      if (action === "comment") openBubble("comment");
      if (action === "edit") openBubble("edit");
      if (action === "close-bubble") closeBubble();
      if (action === "save-comment") saveCurrentComment();
      if (action === "copy-prompt") copyText(buildPrompt(), "Prompt");
      if (action === "copy-selection") copyText(state.selectedText, "Selection");
      if (action === "review") togglePanel();
      if (action === "close-panel") closePanel();
      if (action === "copy-packet") copyPacket();
      if (action === "download-packet") downloadPacket();
      if (action === "submit-packet") submitPacket();
      if (action === "refresh-progress") pollProgress(true);
      if (action === "clear-comments") clearComments();
      closeMenu();
      return;
    }

    if (!event.target.closest(".hrp-menu")) closeMenu();
    if (!event.target.closest(".hrp-bubble")) closeBubble();
    if (!event.target.closest(".hrp-panel") && !event.target.closest(".hrp-fab")) closePanel();
  });

  function readConfig() {
    const fallback = {
      documentFile: "",
      generatorFile: "",
      title: "",
      storageKey: "",
      bridgeUrl: "http://127.0.0.1:8783/api/review-packet",
      sectionSelector: ""
    };
    try {
      const el = document.getElementById("html-review-packets-config");
      return Object.assign(fallback, JSON.parse(el ? el.textContent : "{}"));
    } catch (_error) {
      return fallback;
    }
  }

  function cleanText(text, max) {
    const limit = max || 1800;
    const cleaned = String(text || "").replace(/\s+/g, " ").trim();
    return cleaned.length > limit ? cleaned.slice(0, limit - 1).trim() + "..." : cleaned;
  }

  function elementText(el, max) {
    return cleanText(el ? (el.innerText || el.textContent || "") : "", max);
  }

  function selectionInfo(event) {
    const selection = window.getSelection();
    let selectedText = "";
    let range = null;
    let anchor = event.target;

    if (selection && selection.rangeCount && !selection.isCollapsed) {
      selectedText = selection.toString().trim();
      if (selectedText) {
        range = selection.getRangeAt(0).cloneRange();
        anchor = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
          ? range.commonAncestorContainer
          : range.commonAncestorContainer.parentElement;
      }
    }

    const target = nearestTarget(anchor, event);
    if (!target) return null;
    const text = selectedText || elementText(target, 2400);
    if (!text) return null;
    const rect = range ? range.getBoundingClientRect() : target.getBoundingClientRect();

    return {
      target,
      range,
      selectedText: cleanText(text, 2400),
      sectionPath: sectionPath(target),
      anchorX: rect.left || event.clientX,
      anchorY: (rect.bottom || event.clientY) + 8
    };
  }

  function nearestTarget(node, event) {
    const start = node && node.closest ? node : document.elementFromPoint(event.clientX, event.clientY);
    if (!start || !start.closest) return null;
    return start.closest(selector) || start.closest("p,li,td,th,blockquote,h1,h2,h3,h4,section,article");
  }

  function sectionPath(target) {
    const localHeading = target.matches("section,article,[data-review-section],.section,.card,.block")
      ? target.querySelector("h1,h2,h3,h4")
      : null;
    const section = target.closest("section,article,[data-review-section],.section,.card,.block");
    const sectionHeading = section && section !== target ? section.querySelector("h1,h2,h3,h4") : null;
    const heading = localHeading || sectionHeading || previousHeading(target);
    return cleanText(heading ? heading.textContent : (config.title || document.title || "HTML document"), 160);
  }

  function previousHeading(target) {
    let node = target;
    while (node && node !== document.body) {
      let sibling = node.previousElementSibling;
      while (sibling) {
        if (/^H[1-4]$/.test(sibling.tagName)) return sibling;
        const nested = sibling.querySelector && sibling.querySelector("h1,h2,h3,h4");
        if (nested) return nested;
        sibling = sibling.previousElementSibling;
      }
      node = node.parentElement;
    }
    return null;
  }

  function documentContext() {
    const headings = Array.from(document.querySelectorAll("h1,h2,h3"))
      .slice(0, 12)
      .map((el, index) => `${index + 1}. ${cleanText(el.textContent, 120)}`)
      .join("\n");
    const summary = elementText(document.querySelector("main,article,body"), 900);
    return [headings, summary].filter(Boolean).join("\n\n");
  }

  function currentContext() {
    return elementText(state.target, 2400);
  }

  function normalizeComment(input) {
    return {
      id: input.id || newCommentId(),
      createdAt: input.createdAt || new Date().toISOString(),
      section: cleanText(input.section || state.sectionPath || document.title, 180),
      selectedText: cleanText(input.selectedText || state.selectedText || "", 2400),
      nearbyContext: cleanText(input.nearbyContext || currentContext(), 3000),
      comment: cleanText(input.comment || "Review this selection.", 1400),
      proposedReplacement: cleanText(input.proposedReplacement || "", 3000)
    };
  }

  function buildPacket() {
    return {
      schema: "html_review_packet.v1",
      version: VERSION,
      createdAt: new Date().toISOString(),
      document: {
        title: config.title || document.title,
        url: location.href,
        file: config.documentFile || "",
        generator: config.generatorFile || ""
      },
      instructions: {
        preferredAction: "Review all comments together, checkpoint the source, amend only the relevant sections, regenerate the HTML if there is a generator, and report the diff.",
        versioning: "Prefer git for checkpointing. If git is unavailable, copy touched files into .html-review-packets/versions before editing."
      },
      documentContext: documentContext(),
      comments: state.comments.map((comment, index) => Object.assign({ index: index + 1 }, comment))
    };
  }

  function buildPrompt() {
    const packet = buildPacket();
    return [
      "Apply this HTML review packet.",
      "",
      "Rules:",
      "- Keep the whole document context in mind.",
      "- Amend only the relevant section unless the packet asks for broader cleanup.",
      "- Checkpoint the source before editing.",
      "- Regenerate the HTML if a generator is listed.",
      "",
      "Packet:",
      "```json",
      JSON.stringify(packet, null, 2),
      "```"
    ].join("\n");
  }

  function loadComments() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function saveComments() {
    localStorage.setItem(storageKey, JSON.stringify(state.comments, null, 2));
    renderComments();
    updateCount();
  }

  function loadProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(progressKey) || "null");
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (_error) {
      return null;
    }
  }

  function newCommentId() {
    return "hrp-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function openBubble(mode) {
    if (!state.selectedText) {
      showToast("Select text first.");
      return;
    }
    titleEl.textContent = mode === "edit" ? "Suggest replacement" : "Comment";
    quoteEl.textContent = state.selectedText;
    commentInput.value = "";
    replacementInput.value = "";
    bubble.classList.toggle("is-edit", mode === "edit");
    bubble.classList.add("is-open");
    positionFloating(bubble, state.anchorX, state.anchorY, 380);
    commentInput.focus();
  }

  function saveCurrentComment() {
    const comment = commentInput.value.trim();
    const proposedReplacement = replacementInput.value.trim();
    if (!comment && !proposedReplacement) {
      showToast("Write a comment first.");
      return;
    }
    if (!state.selectedText) {
      showToast("Select text before saving a comment.");
      return;
    }
    const item = normalizeComment({
      comment: comment || "Use the proposed replacement.",
      proposedReplacement
    });
    state.comments.push(item);
    saveComments();
    markRange(item.id, state.range);
    closeBubble();
    showToast("Saved comment " + state.comments.length + ".");
  }

  function markRange(id, range) {
    if (!range) return;
    try {
      const mark = document.createElement("mark");
      mark.className = "hrp-mark";
      mark.dataset.hrpCommentId = id;
      range.surroundContents(mark);
    } catch (_error) {
      if (state.target) state.target.dataset.hrpCommentId = id;
    }
  }

  function restoreCommentMarks() {
    window.setTimeout(() => state.comments.forEach(markTextOccurrence), 0);
  }

  function markTextOccurrence(comment) {
    if (!comment.selectedText || document.querySelector('[data-hrp-comment-id="' + cssEscape(comment.id) + '"]')) return;
    const needle = comment.selectedText.slice(0, 160);
    const root = document.querySelector("main,article,body") || document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.includes(needle)) return NodeFilter.FILTER_REJECT;
        if (node.parentElement.closest("script,style,.hrp-bubble,.hrp-panel,.hrp-menu")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const node = walker.nextNode();
    if (!node) return;
    const start = node.nodeValue.indexOf(needle);
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, start + needle.length);
    markRange(comment.id, range);
  }

  function renderComments() {
    if (!listEl) return;
    if (!state.comments.length) {
      listEl.innerHTML = '<div class="hrp-card"><p>No saved comments yet.</p></div>';
      return;
    }
    listEl.innerHTML = state.comments.map((comment, index) => [
      '<div class="hrp-card" data-hrp-card="' + attr(comment.id) + '">',
      "  <strong>" + (index + 1) + ". " + escapeHtml(comment.section || "Section") + "</strong>",
      "  <p><b>Selected:</b> " + escapeHtml(cleanText(comment.selectedText, 220)) + "</p>",
      "  <p><b>Comment:</b> " + escapeHtml(cleanText(comment.comment, 320)) + "</p>",
      comment.proposedReplacement ? "  <p><b>Draft:</b> " + escapeHtml(cleanText(comment.proposedReplacement, 260)) + "</p>" : "",
      '  <div class="hrp-card-actions">',
      '    <button type="button" data-hrp-comment-action="focus" data-hrp-comment-id="' + attr(comment.id) + '">Focus</button>',
      '    <button type="button" data-hrp-comment-action="copy" data-hrp-comment-id="' + attr(comment.id) + '">Copy</button>',
      '    <button type="button" data-hrp-comment-action="delete" data-hrp-comment-id="' + attr(comment.id) + '">Delete</button>',
      "  </div>",
      "</div>"
    ].join("")).join("");
  }

  function setProgress(progress) {
    state.progress = progress ? normalizeProgress(progress) : null;
    if (state.progress) localStorage.setItem(progressKey, JSON.stringify(state.progress, null, 2));
    else localStorage.removeItem(progressKey);
    renderProgress();
  }

  function normalizeProgress(progress) {
    const now = new Date().toISOString();
    const incoming = progress || {};
    const carryPrevious = Boolean(state.progress)
      && !incoming.id
      && incoming.status !== "submitting"
      && incoming.status !== "needs_manual_apply"
      && incoming.statusUrl !== "";
    const next = Object.assign({
      schema: "html_review_progress.v1",
      id: "",
      statusUrl: "",
      status: "unknown",
      phase: "",
      percent: 0,
      message: "",
      updatedAt: now,
      terminal: false,
      steps: []
    }, carryPrevious ? state.progress : {}, incoming);
    next.percent = Math.max(0, Math.min(100, Number(next.percent || 0)));
    next.terminal = Boolean(next.terminal || isTerminalStatus(next.status));
    if (!Array.isArray(next.steps)) next.steps = [];
    return next;
  }

  function renderProgress() {
    if (!progressEl) return;
    const progress = state.progress;
    if (!progress) {
      progressEl.hidden = true;
      return;
    }
    progressEl.hidden = false;
    progressEl.dataset.status = progress.status || "unknown";
    const title = progressEl.querySelector(".hrp-progress-title");
    const message = progressEl.querySelector(".hrp-progress-message");
    const bar = progressEl.querySelector(".hrp-progress-bar span");
    const meta = progressEl.querySelector(".hrp-progress-meta");
    const steps = progressEl.querySelector(".hrp-progress-steps");
    if (title) title.textContent = progressTitle(progress);
    if (message) message.textContent = progress.message || "";
    if (bar) bar.style.width = (progress.percent || 0) + "%";
    if (meta) {
      const parts = [];
      if (progress.id) parts.push("ID " + progress.id);
      if (progress.phase) parts.push(progress.phase);
      if (progress.updatedAt) parts.push("updated " + new Date(progress.updatedAt).toLocaleTimeString());
      meta.textContent = parts.join(" · ");
    }
    if (steps) {
      steps.innerHTML = (progress.steps || []).map((step) => [
        '<div class="hrp-step" data-step-status="' + attr(step.status || "pending") + '">',
        '  <span class="hrp-step-dot"></span>',
        '  <span class="hrp-step-label">' + escapeHtml(step.label || step.key || "Step") + '</span>',
        '  <span class="hrp-step-state">' + escapeHtml(step.status || "pending") + '</span>',
        '</div>'
      ].join("")).join("");
    }
  }

  function progressTitle(progress) {
    const labels = {
      submitting: "Submitting packet",
      waiting_for_agent: "Waiting for agent",
      agent_queued: "Agent queued",
      agent_running: "Agent working",
      completed: "Review applied",
      failed: "Review failed",
      needs_manual_apply: "Manual apply needed"
    };
    return labels[progress.status] || "Agent progress";
  }

  function updateCount() {
    const count = fab.querySelector(".hrp-count");
    if (count) count.textContent = String(state.comments.length);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-open");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("is-open"), 2600);
  }

  function closeMenu() {
    menu.classList.remove("is-open");
  }

  function closeBubble() {
    bubble.classList.remove("is-open", "is-edit");
  }

  function closePanel() {
    panel.classList.remove("is-open");
  }

  function togglePanel() {
    renderComments();
    renderProgress();
    panel.classList.toggle("is-open");
  }

  function highlightTarget(target) {
    document.querySelectorAll(".hrp-target").forEach((el) => el.classList.remove("hrp-target"));
    if (target) target.classList.add("hrp-target");
  }

  function focusComment(id) {
    const mark = document.querySelector('[data-hrp-comment-id="' + cssEscape(id) + '"]');
    if (mark) {
      mark.scrollIntoView({ behavior: "smooth", block: "center" });
      highlightTarget(mark.closest(selector) || mark);
      closePanel();
    }
  }

  function deleteComment(id) {
    state.comments = state.comments.filter((comment) => comment.id !== id);
    document.querySelectorAll('[data-hrp-comment-id="' + cssEscape(id) + '"]').forEach((node) => {
      if (node.tagName === "MARK") node.replaceWith(document.createTextNode(node.textContent));
      else delete node.dataset.hrpCommentId;
    });
    saveComments();
    showToast("Comment deleted.");
  }

  function clearComments() {
    state.comments = [];
    localStorage.removeItem(storageKey);
    document.querySelectorAll(".hrp-mark").forEach((node) => node.replaceWith(document.createTextNode(node.textContent)));
    renderComments();
    updateCount();
    showToast("Comments cleared.");
  }

  function commentById(id) {
    return state.comments.find((comment) => comment.id === id);
  }

  function copySingleComment(id) {
    const comment = commentById(id);
    if (!comment) return;
    copyText(JSON.stringify(comment, null, 2), "Comment");
  }

  async function copyPacket() {
    const copied = await copyText(buildPrompt(), "Review packet");
    if (!copied) downloadPacket();
  }

  function downloadPacket() {
    const packet = buildPacket();
    const blob = new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "html-review-packet-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Packet downloaded.");
  }

  async function submitPacket() {
    const packet = buildPacket();
    if (!packet.comments.length) {
      showToast("Save at least one comment first.");
      return;
    }
    setProgress({
      id: "",
      statusUrl: "",
      status: "submitting",
      phase: "submit",
      percent: 8,
      message: "Submitting review packet to the local bridge.",
      terminal: false,
      updatedAt: new Date().toISOString(),
      steps: [
        { key: "submitted", label: "Packet submitted", status: "running" },
        { key: "checkpoint", label: "Create version checkpoint", status: "pending" },
        { key: "apply", label: "Apply requested amendments", status: "pending" },
        { key: "regenerate", label: "Regenerate HTML", status: "pending" },
        { key: "verify", label: "Verify and summarize", status: "pending" }
      ]
    });
    panel.classList.add("is-open");
    try {
      const result = await postPacket(packet);
      const progress = normalizeProgress(result.progress || {
        id: result.reviewId || "",
        status: result.agentStarted ? "agent_queued" : "waiting_for_agent",
        phase: "submitted",
        percent: result.agentStarted ? 30 : 20,
        message: result.agentStarted ? "Review packet saved. Agent queued." : "Review packet saved. Waiting for an agent to apply it.",
        steps: result.progress?.steps || []
      });
      progress.statusUrl = statusUrlForResult(result);
      setProgress(progress);
      startProgressPolling();
      showToast("Review packet saved: " + (result.reviewPath || "packet JSON") + ".");
    } catch (_error) {
      const copied = await copyText(buildPrompt(), "Review packet");
      setProgress({
        id: "",
        statusUrl: "",
        status: "needs_manual_apply",
        phase: "manual",
        percent: copied ? 10 : 0,
        message: copied ? "Bridge unavailable. Packet copied for manual agent apply." : "Bridge unavailable. Download the JSON packet and give it to the agent.",
        terminal: true,
        updatedAt: new Date().toISOString(),
        steps: [
          { key: "submitted", label: "Packet submitted", status: "failed" },
          { key: "manual", label: "Manual handoff", status: copied ? "done" : "pending" }
        ]
      });
      if (copied) showToast("Bridge unavailable. Packet copied.");
      else downloadPacket();
    }
  }

  async function postPacket(packet) {
    const body = JSON.stringify(packet);
    let lastError = null;
    for (const endpoint of packetEndpoints()) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          mode: "cors",
          headers: { "content-type": "application/json" },
          body
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const data = await response.json();
        data._endpoint = endpoint;
        return data;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("No review bridge endpoint configured.");
  }

  function packetEndpoints() {
    const endpoints = [];
    if (location.protocol !== "file:") endpoints.push(new URL("/api/review-packet", location.href).href);
    if (config.bridgeUrl) endpoints.push(config.bridgeUrl);
    return Array.from(new Set(endpoints));
  }

  function statusUrlForResult(result) {
    if (!result || !result.statusUrl) return "";
    try {
      const base = result._endpoint ? new URL(result._endpoint).origin : location.href;
      return new URL(result.statusUrl, base).href;
    } catch (_error) {
      return result.statusUrl || "";
    }
  }

  function startProgressPolling() {
    window.clearInterval(state.progressTimer);
    if (!state.progress || !state.progress.statusUrl || state.progress.terminal) return;
    state.progressTimer = window.setInterval(() => pollProgress(false), 2000);
    pollProgress(false);
  }

  async function pollProgress(force) {
    if (!state.progress || !state.progress.statusUrl) {
      if (force) showToast("No progress endpoint for this packet.");
      return;
    }
    try {
      const response = await fetch(state.progress.statusUrl, { method: "GET", mode: "cors" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const progress = await response.json();
      progress.statusUrl = state.progress.statusUrl;
      setProgress(progress);
      if (state.progress.terminal) window.clearInterval(state.progressTimer);
      if (force) showToast("Progress refreshed.");
    } catch (_error) {
      if (force) showToast("Could not refresh progress.");
    }
  }

  function isTerminalStatus(status) {
    return ["completed", "failed", "cancelled", "needs_manual_apply"].includes(status);
  }

  async function copyText(text, label) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.append(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      showToast(label + " copied.");
      return true;
    } catch (_error) {
      return false;
    }
  }

  function positionFloating(el, x, y, width) {
    const margin = 12;
    const measuredWidth = Math.min(width || 380, window.innerWidth - margin * 2);
    const measuredHeight = Math.min(el.offsetHeight || 240, window.innerHeight - margin * 2);
    const left = Math.min(Math.max(margin, x), window.innerWidth - measuredWidth - margin);
    const top = Math.min(Math.max(margin, y), window.innerHeight - measuredHeight - margin);
    el.style.left = left + "px";
    el.style.top = top + "px";
  }

  function escapeHtml(text) {
    return String(text || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function attr(text) {
    return escapeHtml(text).replaceAll("'", "&#39;");
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/["\\]/g, "\\$&");
  }
}
