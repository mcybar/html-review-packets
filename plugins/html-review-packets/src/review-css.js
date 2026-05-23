export function renderReviewCss() {
  return `
:root {
  --hrp-ink: #171717;
  --hrp-muted: #5f646d;
  --hrp-line: #d9dde5;
  --hrp-bg: #ffffff;
  --hrp-soft: #f6f7f9;
  --hrp-accent: #2563eb;
  --hrp-accent-soft: #dbe8ff;
  --hrp-mark: #fff1a8;
}

.hrp-menu,
.hrp-bubble,
.hrp-panel,
.hrp-toast,
.hrp-fab {
  box-sizing: border-box;
  color: var(--hrp-ink);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  letter-spacing: 0;
}

.hrp-menu,
.hrp-bubble,
.hrp-panel {
  position: fixed;
  z-index: 2147483647;
  display: none;
  width: min(380px, calc(100vw - 24px));
  border: 1px solid var(--hrp-line);
  border-radius: 8px;
  background: var(--hrp-bg);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
}

.hrp-menu.is-open,
.hrp-bubble.is-open,
.hrp-panel.is-open {
  display: block;
}

.hrp-menu {
  padding: 6px;
}

.hrp-menu button,
.hrp-button,
.hrp-card-actions button {
  min-height: 30px;
  border: 1px solid var(--hrp-line);
  border-radius: 6px;
  background: #fff;
  color: var(--hrp-ink);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.hrp-menu button {
  display: block;
  width: 100%;
  padding: 7px 9px;
  border: 0;
  text-align: left;
}

.hrp-menu button:hover,
.hrp-card-actions button:hover,
.hrp-button:hover {
  background: var(--hrp-soft);
}

.hrp-primary {
  border-color: var(--hrp-accent);
  background: var(--hrp-accent);
  color: white;
}

.hrp-primary:hover {
  background: #1d4ed8;
}

.hrp-hint,
.hrp-key-hint {
  color: var(--hrp-muted);
  font-size: 11px;
  line-height: 1.35;
}

.hrp-hint {
  padding: 6px 9px 4px;
}

.hrp-bubble {
  padding: 10px;
}

.hrp-bubble-head,
.hrp-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.hrp-bubble-title,
.hrp-panel-head strong {
  font-size: 13px;
  font-weight: 700;
}

.hrp-close {
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--hrp-muted);
  cursor: pointer;
}

.hrp-close:hover {
  background: var(--hrp-soft);
  color: var(--hrp-ink);
}

.hrp-quote {
  max-height: 88px;
  overflow: auto;
  margin-bottom: 8px;
  padding: 8px;
  border-left: 3px solid var(--hrp-accent);
  background: var(--hrp-soft);
  color: var(--hrp-muted);
  font-size: 12px;
  line-height: 1.4;
}

.hrp-input,
.hrp-replacement {
  display: block;
  width: 100%;
  min-height: 72px;
  resize: vertical;
  box-sizing: border-box;
  border: 1px solid var(--hrp-line);
  border-radius: 7px;
  padding: 8px;
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
}

.hrp-replacement {
  display: none;
  min-height: 84px;
  margin-top: 8px;
}

.hrp-bubble.is-edit .hrp-replacement {
  display: block;
}

.hrp-bubble-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 8px;
}

.hrp-buttons {
  display: flex;
  gap: 6px;
}

.hrp-button {
  padding: 5px 9px;
}

.hrp-fab {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 2147483646;
  min-height: 34px;
  border: 1px solid var(--hrp-line);
  border-radius: 999px;
  padding: 0 12px;
  background: var(--hrp-bg);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
  color: var(--hrp-ink);
  font-size: 13px;
  cursor: pointer;
}

.hrp-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  margin-left: 5px;
  border-radius: 999px;
  background: var(--hrp-accent-soft);
  color: #1e3a8a;
  font-size: 11px;
  font-weight: 700;
}

.hrp-panel {
  right: 18px;
  bottom: 62px;
  max-height: min(560px, calc(100vh - 88px));
  overflow: auto;
  padding: 10px;
}

.hrp-panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 10px;
}

.hrp-list {
  display: grid;
  gap: 8px;
}

.hrp-progress {
  display: grid;
  gap: 9px;
  margin-bottom: 10px;
  border: 1px solid var(--hrp-line);
  border-radius: 8px;
  padding: 10px;
  background: #fbfcfe;
}

.hrp-progress[hidden] {
  display: none;
}

.hrp-progress-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.hrp-progress-title {
  display: block;
  font-size: 13px;
}

.hrp-progress-message {
  margin: 3px 0 0;
  color: var(--hrp-muted);
  font-size: 12px;
  line-height: 1.35;
}

.hrp-progress-bar {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: #e8ebf0;
}

.hrp-progress-bar span {
  display: block;
  width: 0;
  height: 100%;
  border-radius: inherit;
  background: var(--hrp-accent);
  transition: width 180ms ease;
}

.hrp-progress[data-status="completed"] .hrp-progress-bar span {
  background: #108a4f;
}

.hrp-progress[data-status="failed"] .hrp-progress-bar span,
.hrp-progress[data-status="needs_manual_apply"] .hrp-progress-bar span {
  background: #c2410c;
}

.hrp-progress-meta {
  color: var(--hrp-muted);
  font-size: 11px;
  line-height: 1.35;
}

.hrp-progress-steps {
  display: grid;
  gap: 5px;
}

.hrp-step {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  color: var(--hrp-muted);
  font-size: 12px;
}

.hrp-step-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #c4cad4;
}

.hrp-step[data-step-status="running"] .hrp-step-dot {
  background: var(--hrp-accent);
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.hrp-step[data-step-status="done"] .hrp-step-dot {
  background: #108a4f;
}

.hrp-step[data-step-status="failed"] .hrp-step-dot {
  background: #c2410c;
}

.hrp-step-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hrp-step-state {
  font-size: 11px;
}

.hrp-card {
  border: 1px solid var(--hrp-line);
  border-radius: 8px;
  padding: 9px;
  background: #fff;
}

.hrp-card strong {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
}

.hrp-card p {
  margin: 5px 0;
  color: var(--hrp-muted);
  font-size: 12px;
  line-height: 1.35;
}

.hrp-card-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
}

.hrp-card-actions button {
  padding: 4px 8px;
  font-size: 12px;
}

.hrp-mark {
  border-bottom: 2px solid #f0b429;
  background: var(--hrp-mark);
  padding: 0 1px;
}

.hrp-target {
  outline: 2px solid rgba(37, 99, 235, 0.35);
  outline-offset: 3px;
}

.hrp-toast {
  position: fixed;
  left: 50%;
  bottom: 20px;
  z-index: 2147483647;
  display: none;
  max-width: min(520px, calc(100vw - 32px));
  transform: translateX(-50%);
  border-radius: 999px;
  padding: 9px 13px;
  background: #111827;
  color: white;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.25);
  font-size: 13px;
}

.hrp-toast.is-open {
  display: block;
}

@media print {
  .hrp-menu,
  .hrp-bubble,
  .hrp-panel,
  .hrp-toast,
  .hrp-fab {
    display: none !important;
  }
  .hrp-mark {
    border-bottom: 0;
    background: transparent;
    padding: 0;
  }
}
`;
}
