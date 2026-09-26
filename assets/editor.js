// Change these two values when using your own repository.
const REPO = "kangmin1012",
  REPO_N = "RemoteCompose_Sample_Web";
// Display labels stay separate from the Remote Compose JSON type names.
const elementLabels = {
  text: "텍스트",
  button: "버튼",
  spacer: "세로 여백",
  hspacer: "가로 여백",
  divider: "구분선",
  card: "카드",
  row: "가로 배치",
  icon: "아이콘",
};
const screens = {
  home: {
    file: "config.json",
    label: "홈",
    elements: [],
    bg: "#F5F0FF",
    scrollable: false,
    padding: null,
  },
  detail: {
    file: "config_detail.json",
    label: "상세",
    elements: [],
    bg: "#F0F4F8",
    scrollable: false,
    padding: null,
  },
};
let activeScreen = "home";
let elements = [],
  nextId = 1;
let expandedIds = [],
  dragPath = null;
const usedIds = new Set();
const defaultBackgrounds = { home: "#F5F0FF", detail: "#F0F4F8" };
Object.values(screens).forEach((s) => {
  s.revision = 0;
});
function uid() {
  while (usedIds.has(String(nextId))) nextId++;
  const id = String(nextId++);
  usedIds.add(id);
  return id;
}
function currentFile() {
  return screens[activeScreen].file;
}
function init() {
  try {
    const token = localStorage.getItem("gh_token");
    if (token) document.getElementById("ghToken").value = token;
  } catch {
    /* Editing also works when browser storage is unavailable. */
  }
  updateVersionLabel();
  onPreviewLoad();
  fetchScreen("home");
  fetchScreen("detail");
}
const BUILD_VERSION = 85;
function updateVersionLabel() {
  document.getElementById("versionLabel").textContent =
    "0.0." + BUILD_VERSION + "-alpha";
}
async function fetchScreen(key) {
  const s = screens[key],
    revision = s.revision;
  try {
    const r = await fetch(s.file + "?" + Date.now());
    if (!r.ok) throw new Error("Config unavailable");
    const c = await r.json();
    // A late initial response must not replace edits or a Reset.
    if (s.revision !== revision) return;
    nextId = Math.max(nextId, maxId(c.elements || []) + 1);
    s.bg = c.backgroundColor || defaultBackgrounds[key];
    s.scrollable = c.scrollable ?? false;
    s.padding = c.padding ?? null;
    s.elements = (c.elements || []).map(assignIds);
  } catch {
    if (s.revision !== revision) return;
    loadScreenDefs(key);
  }
  if (key === activeScreen) activateScreen();
}
function loadScreenDefs(key) {
  const defs = { home: defaultsHome, detail: defaultsDetail }[key];
  Object.assign(screens[key], {
    elements: JSON.parse(JSON.stringify(defs)).map(assignIds),
    bg: defaultBackgrounds[key],
    scrollable: false,
    padding: null,
  });
}
function activateScreen() {
  const s = screens[activeScreen];
  elements = s.elements;
  document.getElementById("bgColor").value = s.bg;
  expandedIds = [];
  dragPath = null;
  render();
}
function switchScreen(key) {
  if (key === activeScreen || !screens[key]) return;
  screens[activeScreen].elements = elements;
  screens[activeScreen].bg = document.getElementById("bgColor").value;
  activeScreen = key;
  document
    .querySelectorAll(".screen-tab")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById("tab-" + key).classList.add("active");
  activateScreen();
}
function assignIds(el) {
  const id = el.id == null ? null : String(el.id);
  const e = { ...el, id: id && !usedIds.has(id) ? id : uid() };
  usedIds.add(e.id);
  if (e.children) e.children = e.children.map(assignIds);
  return e;
}
function maxId(els) {
  return els.reduce(
    (m, e) => Math.max(m, parseInt(e.id) || 0, maxId(e.children || [])),
    0,
  );
}
function markEdited() {
  screens[activeScreen].revision++;
}
function resetToDefaults() {
  nextId = 1;
  usedIds.clear();
  Object.keys(screens).forEach((key) => {
    screens[key].revision++;
    loadScreenDefs(key);
  });
  activateScreen();
  showToast("기본 구성으로 초기화했습니다", "restart_alt");
}
function createElement(type, nested = false) {
  const el = { type, id: uid() };
  if (type === "text")
    Object.assign(el, {
      text: "새 텍스트",
      color: nested ? "#333333" : "#000000",
      fontSize: nested ? 14 : 16,
    });
  if (type === "button")
    Object.assign(el, {
      text: "버튼",
      color: "#6200EA",
      textColor: "#FFFFFF",
      fontSize: nested ? 14 : 16,
      cornerRadius: nested ? 20 : 24,
    });
  if (type === "button" && !nested) el.actionName = "btn_" + el.id;
  if (type === "spacer") el.height = 16;
  if (type === "hspacer") el.width = 16;
  if (type === "divider") Object.assign(el, { color: "#CCCCCC", height: 1 });
  if (type === "card") {
    Object.assign(el, {
      color: "#FFFFFF",
      cornerRadius: nested ? 0 : 16,
      paddingH: nested ? 14 : 16,
      paddingV: nested ? 10 : 16,
      children: [],
    });
    if (!nested)
      el.children.push({ ...createElement("text", true), text: "카드 내용" });
  }
  if (type === "row")
    el.children = [
      { ...createElement("button", true), text: "왼쪽" },
      { ...createElement("button", true), text: "오른쪽", color: "#00897B" },
    ];
  return el;
}
function elementAt(path) {
  return path.reduce(
    (list, index, depth) =>
      depth === path.length - 1 ? list[index] : list[index].children,
    elements,
  );
}
function siblingsAt(path) {
  return path.length === 1 ? elements : elementAt(path.slice(0, -1)).children;
}
function addElement(type) {
  elements.push(createElement(type));
  markEdited();
  render();
}
function addNestedElement(path, type) {
  const parent = elementAt(path);
  (parent.children ||= []).push(createElement(type, true));
  markEdited();
  render();
}
function deleteEditorElement(path) {
  siblingsAt(path).splice(path.at(-1), 1);
  markEdited();
  render();
}
function toggleEditorElement(path) {
  const el = elementAt(path),
    depth = path.length - 1;
  const wasExpanded = expandedIds[depth] === el.id;
  expandedIds.length = depth;
  if (!wasExpanded) expandedIds.push(el.id);
  syncExpanded();
}
function syncExpanded() {
  document.querySelectorAll("[data-element-id]").forEach((node) => {
    const open = expandedIds.includes(node.dataset.elementId);
    node.classList.toggle(
      node.classList.contains("el-card") ? "expanded" : "child-expanded",
      open,
    );
    node
      .querySelector("[aria-expanded]")
      ?.setAttribute("aria-expanded", String(open));
    node.querySelector(".el-editor,.child-editor").hidden = !open;
  });
}
function onEditorKey(event, path) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    event.stopPropagation();
    toggleEditorElement(path);
  }
}
const numberFields = new Set([
  "fontSize",
  "height",
  "width",
  "cornerRadius",
  "borderWidth",
  "paddingH",
  "paddingV",
]);
function onElementField(path, field, input) {
  const el = elementAt(path);
  el[field] = numberFields.has(field)
    ? parseInt(input.value, 10) || 0
    : input.value;
  if (field === "borderWidth" && el.borderWidth > 0 && !el.borderColor) {
    el.borderColor = el.type === "card" ? "#CCCCCC" : "#000000";
  }
  const node = input.closest("[data-element-id]");
  const summary = node?.querySelector(
    path.length === 1 ? ".el-summary" : ".child-summary",
  );
  if (summary) summary.textContent = elementSummary(el);
  node?.querySelectorAll('input[type="color"]').forEach((color) => {
    if (color.closest("[data-element-id]") !== node) return;
    color.nextElementSibling.textContent =
      color.dataset.field === "borderColor" && !el.borderColor
        ? "없음"
        : (el[color.dataset.field] || color.value).toUpperCase();
  });
  markEdited();
  updatePreview();
}
function onBackgroundChange() {
  markEdited();
  updatePreview();
}
function onEditorDragStart(event, path) {
  event.stopPropagation();
  // Inputs/buttons must remain editable inside draggable containers.
  if (event.target.closest("input,button")) {
    event.preventDefault();
    return;
  }
  dragPath = path;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", elementAt(path).id);
  event.currentTarget.classList.add("dragging");
}
function sameParent(a, b) {
  return (
    a && a.length === b.length && a.slice(0, -1).every((x, i) => x === b[i])
  );
}
function onEditorDragOver(event, path) {
  event.stopPropagation();
  if (!sameParent(dragPath, path)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  document
    .querySelectorAll(".drag-over")
    .forEach((n) => n.classList.remove("drag-over"));
  event.currentTarget.classList.add("drag-over");
}
function onEditorDrop(event, path) {
  event.preventDefault();
  event.stopPropagation();
  if (sameParent(dragPath, path) && dragPath.at(-1) !== path.at(-1)) {
    const list = siblingsAt(path);
    list.splice(path.at(-1), 0, list.splice(dragPath.at(-1), 1)[0]);
    markEdited();
    render();
  }
  onEditorDragEnd(event);
}
function onEditorDragEnd(event) {
  event.stopPropagation();
  dragPath = null;
  document
    .querySelectorAll(".dragging,.drag-over")
    .forEach((n) => n.classList.remove("dragging", "drag-over"));
}
function elementSummary(el) {
  if (el.type === "card")
    return (
      (el.children?.length || 0) +
      "개 하위 요소" +
      (el.actionName ? " (클릭 가능)" : "")
    );
  if (el.type === "row") return (el.children?.length || 0) + "개 항목";
  if (el.type === "spacer") return (el.height ?? 16) + "dp";
  if (el.type === "hspacer") return (el.width ?? 16) + "dp 너비";
  return el.text || elementLabels[el.type] || el.type;
}
function render() {
  document.getElementById("elCount").textContent =
    "요소 " + elements.length + "개";
  document.getElementById("elementList").innerHTML = elements
    .map((el, i) => renderElement(el, [i]))
    .join("");
  syncExpanded();
  updatePreview();
}
function renderElement(el, path) {
  const root = path.length === 1,
    p = JSON.stringify(path);
  return `<div class="${root ? "el-card" : "child-item"}" data-element-id="${esc(el.id)}" style="${root ? "" : "display:flex;align-items:stretch"}" draggable="true" ondragstart="onEditorDragStart(event,${p})" ondragend="onEditorDragEnd(event)" ondragover="onEditorDragOver(event,${p})" ondrop="onEditorDrop(event,${p})">
    ${root ? '<div class="el-handle"><span class="material-icons-round">drag_indicator</span></div>' : ""}
    <div class="${root ? "el-body" : "child-body"}" style="flex:1;min-width:0">
      <div class="${root ? "el-top" : "child-hdr"}" role="button" tabindex="0" aria-expanded="false" onclick="event.stopPropagation();toggleEditorElement(${p})" onkeydown="onEditorKey(event,${p})"><span class="badge ${esc(el.type)}">${esc(elementLabels[el.type] || el.type)}</span><span class="${root ? "el-summary" : "child-summary"}">${esc(elementSummary(el))}</span></div>
      <div class="${root ? "el-editor" : "child-editor"}">${buildEditor(el, path)}</div>
    </div>
    <div class="${root ? "el-actions" : "child-actions"}"><button type="button" class="${root ? "del" : "child-del-btn"}" onclick="event.stopPropagation();deleteEditorElement(${p})" title="삭제" aria-label="${esc(elementLabels[el.type] || el.type)} 삭제"><span class="material-icons-round">close</span></button></div>
  </div>`;
}
function buildEditor(el, path) {
  const p = JSON.stringify(path);
  const field = (name, label, type, fallback, min, max) => {
    const value = el[name] ?? fallback;
    const input = `<input type="${type}" aria-label="${label}" data-field="${name}" value="${esc(value)}" ${min == null ? "" : `min="${min}" max="${max}"`} oninput="onElementField(${p},'${name}',this)">`;
    return `<div class="field${type === "text" ? " field-wide" : ""}"><label>${label}</label>${type === "color" ? `<div class="cf">${input}<code>${el[name] ? esc(String(value).toUpperCase()) : name === "borderColor" ? "없음" : esc(String(value).toUpperCase())}</code></div>` : input}</div>`;
  };
  const color = (name, label, value) => field(name, label, "color", value);
  const number = (name, label, value, min = 0, max = 50) =>
    field(name, label, "number", value, min, max);
  const text = (name, label) => field(name, label, "text", "");
  let html = "";
  if (["text", "button", "icon"].includes(el.type)) {
    html += text(
      "text",
      el.type === "button"
        ? "버튼 문구"
        : el.type === "icon"
          ? "아이콘 이름"
          : "텍스트",
    );
    html += number(
      "fontSize",
      "글자 크기",
      el.type === "icon" ? 24 : 16,
      8,
      72,
    );
  }
  if (["button", "card", "icon"].includes(el.type))
    html += text("actionName", "액션");
  if (["text", "button", "card", "icon", "divider"].includes(el.type)) {
    html += color(
      "color",
      ["button", "card"].includes(el.type) ? "배경색" : "색상",
      {
        text: "#000000",
        button: "#6200EA",
        card: "#FFFFFF",
        icon: "#333333",
        divider: "#CCCCCC",
      }[el.type],
    );
  }
  if (el.type === "button") html += color("textColor", "글자 색상", "#FFFFFF");
  if (["button", "card"].includes(el.type)) {
    html += number(
      "cornerRadius",
      "모서리 반경",
      el.type === "button" ? 24 : 16,
    );
    html += color(
      "borderColor",
      "테두리 색상",
      el.type === "card" ? "#CCCCCC" : "#000000",
    );
    html += number("borderWidth", "테두리 두께", 0, 0, 10);
  }
  if (["text", "card", "button"].includes(el.type)) {
    html += number(
      "paddingH",
      "좌우 안쪽 여백",
      el.type === "card" ? 16 : el.type === "button" ? 32 : 0,
    );
    html += number(
      "paddingV",
      "상하 안쪽 여백",
      el.type === "card" ? 16 : el.type === "button" ? 14 : 0,
    );
  }
  if (el.type === "spacer") html += number("height", "높이 (dp)", 16, 1, 200);
  if (el.type === "hspacer") html += number("width", "너비 (dp)", 16, 1, 200);
  if (el.type === "divider") html += number("height", "높이", 1, 1, 10);
  if (["card", "row"].includes(el.type)) html += childrenEditor(el, path);
  return `<div class="editor-fields">${html || "<div>편집 가능한 속성이 없습니다</div>"}</div>`;
}
function childrenEditor(el, path) {
  const children = el.children || [];
  return `<div class="children-area"><div class="child-label"><span>하위 요소 (${children.length})</span><div>${["text", "button", "spacer", "hspacer", "divider", "card"].map((type) => `<button type="button" class="btn btn-o btn-s" onclick="event.stopPropagation();addNestedElement(${JSON.stringify(path)},'${type}')">${elementLabels[type]}</button>`).join("")}</div></div>${children.map((child, i) => renderElement(child, [...path, i])).join("")}</div>`;
}
function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

function updatePreview() {
  document.getElementById("bgColorCode").textContent = document
    .getElementById("bgColor")
    .value.toUpperCase();
  sendToPreview();
}
function sendToPreview() {
  const iframe = document.getElementById("composePreview");
  if (iframe && iframe.contentWindow) {
    try {
      iframe.contentWindow.postMessage(JSON.stringify(getConfig()), "*");
    } catch (e) {}
  }
}
function onPreviewLoad() {
  setTimeout(sendToPreview, 500);
  setTimeout(sendToPreview, 1500);
  setTimeout(sendToPreview, 3000);
  setTimeout(sendToPreview, 5000);
}

function getConfig() {
  const s = screens[activeScreen];
  const cfg = {
    backgroundColor: document.getElementById("bgColor").value.toUpperCase(),
  };
  if (s.scrollable) cfg.scrollable = true;
  if (s.padding != null) cfg.padding = s.padding;
  cfg.elements = elements.map((el) => cleanEl(el));
  return cfg;
}
function cleanEl(el) {
  const o = { type: el.type, id: el.id };
  if (el.align) o.align = el.align;
  if (el.paddingH != null) o.paddingH = el.paddingH;
  if (el.paddingV != null) o.paddingV = el.paddingV;
  if (el.type === "text") {
    o.text = el.text;
    o.color = (el.color || "#000000").toUpperCase();
    o.fontSize = el.fontSize ?? 16;
  } else if (el.type === "button") {
    o.text = el.text;
    o.color = (el.color || "#6200EA").toUpperCase();
    o.textColor = (el.textColor || "#FFFFFF").toUpperCase();
    o.fontSize = el.fontSize ?? 16;
    o.cornerRadius = el.cornerRadius != null ? el.cornerRadius : 24;
    if (el.actionName) o.actionName = el.actionName;
    if (el.borderColor && el.borderWidth) {
      o.borderColor = el.borderColor.toUpperCase();
      o.borderWidth = el.borderWidth;
    }
  } else if (el.type === "spacer") {
    o.height = el.height ?? 16;
  } else if (el.type === "hspacer") {
    o.width = el.width ?? 16;
  } else if (el.type === "divider") {
    o.color = (el.color || "#CCCCCC").toUpperCase();
    o.height = el.height ?? 1;
  } else if (el.type === "card") {
    o.color = (el.color || "#FFFFFF").toUpperCase();
    o.cornerRadius = el.cornerRadius != null ? el.cornerRadius : 16;
    o.paddingH = el.paddingH != null ? el.paddingH : 16;
    o.paddingV = el.paddingV != null ? el.paddingV : 16;
    if (el.borderColor && el.borderWidth) {
      o.borderColor = el.borderColor.toUpperCase();
      o.borderWidth = el.borderWidth;
    }
    if (el.actionName) o.actionName = el.actionName;
    if (el.children?.length) o.children = el.children.map((c) => cleanEl(c));
  } else if (el.type === "row") {
    if (el.children?.length) o.children = el.children.map((c) => cleanEl(c));
  } else if (el.type === "icon") {
    o.text = el.text;
    o.color = (el.color || "#333333").toUpperCase();
    o.fontSize = el.fontSize ?? 24;
    if (el.actionName) o.actionName = el.actionName;
  }
  return o;
}

async function copyJson() {
  const j = JSON.stringify(getConfig(), null, 2);
  try {
    try {
      await navigator.clipboard.writeText(j);
    } catch {
      const t = document.createElement("textarea");
      t.value = j;
      document.body.appendChild(t);
      try {
        t.select();
        if (!document.execCommand("copy"))
          throw new Error("복사 권한을 확인해 주세요");
      } finally {
        t.remove();
      }
    }
    showToast("JSON을 복사했습니다", "content_copy");
  } catch {
    showToast(
      "JSON 복사에 실패했습니다. 브라우저의 클립보드 권한을 확인해 주세요",
      "error",
      true,
    );
  }
}
let deployBusy = false,
  deployGeneration = 0;
let deployTimer = null,
  deployResetTimer = null,
  deployStartTime = 0;
async function responseError(response) {
  try {
    return (await response.json()).message || String(response.status);
  } catch {
    return String(response.status);
  }
}
async function deployConfig() {
  if (deployBusy) return;
  const token = document.getElementById("ghToken").value.trim();
  if (!token) {
    showToast("먼저 GitHub 토큰을 입력하세요", "warning", true);
    document.getElementById("ghToken").focus();
    return;
  }
  const screen = screens[activeScreen];
  // Capture the entire submission before awaiting HTTP: editing/switching is allowed.
  const fp = screen.file,
    label = screen.label;
  const content = btoa(
    unescape(encodeURIComponent(JSON.stringify(getConfig(), null, 2) + "\n")),
  );
  const generation = ++deployGeneration;
  deployBusy = true;
  document.getElementById("deployButton").disabled = true;
  try {
    localStorage.setItem("gh_token", token);
  } catch {
    /* Session token still works. */
  }
  setDeploy("deploying");
  try {
    const url = `https://api.github.com/repos/${REPO}/${REPO_N}/contents/${fp}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const existing = await fetch(url, { headers });
    if (!existing.ok && existing.status !== 404)
      throw new Error(await responseError(existing));
    const sha = existing.ok ? (await existing.json()).sha : null;
    const body = {
      message: "Update " + label + " screen from web editor",
      content,
    };
    if (sha) body.sha = sha;
    const r = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(await responseError(r));
    const result = await r.json();
    setDeploy("deployed");
    showToast(
      label + " 화면을 저장했습니다. 배포 진행을 확인합니다",
      "cloud_done",
    );
    if (result.commit?.sha)
      void pollActionStatus(token, result.commit.sha, generation);
    else setDeploy("action_unknown");
  } catch (e) {
    setDeploy("err");
    showToast("배포 실패: " + e.message, "error", true);
  } finally {
    deployBusy = false;
    document.getElementById("deployButton").disabled = false;
  }
}
function setDeploy(status) {
  stopDeployTimer();
  clearTimeout(deployResetTimer);
  const b = document.getElementById("deployStatus"),
    t = document.getElementById("deployStatusText");
  const states = {
    deploying: ["", "저장 중..."],
    deployed: ["action", "저장 완료 · 배포 대기 중..."],
    action_done: ["ok", "✓ 배포 완료"],
    action_fail: ["err", "자동 빌드·배포 실패"],
    action_unknown: ["err", "저장 완료 · 배포 상태 확인 불가"],
    action_timeout: ["action", "저장 완료 · 배포 확인 시간 초과"],
    err: ["err", "저장 실패"],
    ready: ["", "준비됨"],
  };
  const [className, message] = states[status] || states.ready;
  b.className = "sb " + className;
  t.textContent = message;
  if (status === "deployed") {
    deployStartTime = Date.now();
    deployTimer = setInterval(() => {
      const seconds = Math.round((Date.now() - deployStartTime) / 1000);
      t.textContent = "빌드·배포 중... " + seconds + "초";
    }, 1000);
  } else if (status === "action_done") {
    showToast("화면 문서 생성과 배포를 완료했습니다", "check_circle");
    deployResetTimer = setTimeout(() => setDeploy("ready"), 8000);
  }
}
function stopDeployTimer() {
  if (deployTimer) clearInterval(deployTimer);
  deployTimer = null;
}
async function pollActionStatus(token, commitSha, generation) {
  for (let i = 0; i < 60; i++) {
    await new Promise((resolve) => setTimeout(resolve, i === 0 ? 8000 : 4000));
    if (generation !== deployGeneration) return;
    try {
      const resp = await fetch(
        `https://api.github.com/repos/${REPO}/${REPO_N}/actions/workflows/convert.yml/runs?head_sha=${encodeURIComponent(commitSha)}&per_page=10`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (generation !== deployGeneration) return;
      if (!resp.ok) throw new Error(await responseError(resp));
      const data = await resp.json();
      if (generation !== deployGeneration) return;
      const run = data.workflow_runs?.find((run) => run.head_sha === commitSha);
      if (run?.status === "completed") {
        setDeploy(run.conclusion === "success" ? "action_done" : "action_fail");
        return;
      }
    } catch {
      if (generation === deployGeneration) setDeploy("action_unknown");
      return;
    }
  }
  if (generation === deployGeneration) setDeploy("action_timeout");
}
function toggleToken() {
  const i = document.getElementById("ghToken"),
    ic = document.getElementById("tokenEye");
  if (i.type === "password") {
    i.type = "text";
    ic.textContent = "visibility_off";
    ic.closest("button").setAttribute("aria-label", "토큰 숨기기");
  } else {
    i.type = "password";
    ic.textContent = "visibility";
    ic.closest("button").setAttribute("aria-label", "토큰 표시");
  }
}
let toastTimer;
function showToast(msg, icon, err) {
  const t = document.getElementById("toast");
  document.getElementById("toastMsg").textContent = msg;
  document.getElementById("toastIcon").textContent = icon || "check_circle";
  t.style.background = err ? "#b71c1c" : "#323232";
  clearTimeout(toastTimer);
  t.classList.add("show");
  toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}
init();
