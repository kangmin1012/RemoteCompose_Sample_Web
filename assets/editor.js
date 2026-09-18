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
  dragIdx = null,
  nextId = 1,
  expandedIdx = -1,
  expandedChildId = null,
  expandedGcId = null;
function uid() {
  return String(nextId++);
}
function currentFile() {
  return screens[activeScreen].file;
}
function init() {
  const t = localStorage.getItem("gh_token");
  if (t) document.getElementById("ghToken").value = t;
  updateVersionLabel();
  fetchScreen("home");
  fetchScreen("detail");
}
const BUILD_VERSION = 84;
function updateVersionLabel() {
  document.getElementById("versionLabel").textContent =
    "0.0." + BUILD_VERSION + "-alpha";
}
async function fetchScreen(key) {
  const s = screens[key];
  try {
    const r = await fetch(s.file + "?" + Date.now());
    if (r.ok) {
      const c = await r.json();
      s.bg = c.backgroundColor || s.bg;
      if (c.scrollable != null) s.scrollable = c.scrollable;
      if (c.padding != null) s.padding = c.padding;
      s.elements = (c.elements || []).map((e) => assignIds(e));
      nextId = Math.max(nextId, maxId(s.elements) + 1);
    } else {
      loadScreenDefs(key);
    }
  } catch {
    loadScreenDefs(key);
  }
  if (key === activeScreen) activateScreen();
}
function loadScreenDefs(key) {
  const m = { home: defaultsHome, detail: defaultsDetail };
  const defs = m[key] || [];
  screens[key].elements = defs.map((e) =>
    assignIds(JSON.parse(JSON.stringify(e))),
  );
}
function activateScreen() {
  const s = screens[activeScreen];
  elements = s.elements;
  document.getElementById("bgColor").value = s.bg;
  document.getElementById("bgColorCode").textContent = s.bg.toUpperCase();
  expandedIdx = -1;
  expandedChildId = null;
  expandedGcId = null;
  render();
}
function switchScreen(key) {
  if (key === activeScreen) return;
  screens[activeScreen].elements = elements;
  screens[activeScreen].bg = document.getElementById("bgColor").value;
  activeScreen = key;
  document
    .querySelectorAll(".screen-tab")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById("tab-" + key).classList.add("active");
  activateScreen();
}
function assignIds(e) {
  e = { ...e, id: e.id || uid() };
  if (e.children) e.children = e.children.map((c) => assignIds({ ...c }));
  return e;
}
function maxId(els) {
  let m = 0;
  els.forEach((e) => {
    m = Math.max(m, parseInt(e.id) || 0);
    if (e.children) m = Math.max(m, maxId(e.children));
  });
  return m;
}
function resetToDefaults() {
  nextId = 1;
  Object.keys(screens).forEach(loadScreenDefs);
  activateScreen();
  showToast("기본 구성으로 초기화했습니다", "restart_alt");
}
function addElement(type) {
  const el = { type, id: uid() };
  if (type === "text") {
    el.text = "New text";
    el.color = "#000000";
    el.fontSize = 16;
  } else if (type === "button") {
    el.text = "Button";
    el.color = "#6200EA";
    el.textColor = "#FFFFFF";
    el.fontSize = 16;
    el.cornerRadius = 24;
    el.actionName = "btn_" + el.id;
  } else if (type === "spacer") {
    el.height = 16;
  } else if (type === "divider") {
    el.color = "#CCCCCC";
    el.height = 1;
  } else if (type === "card") {
    el.color = "#FFFFFF";
    el.cornerRadius = 16;
    el.paddingH = 16;
    el.paddingV = 16;
    el.children = [
      {
        type: "text",
        id: uid(),
        text: "Card content",
        color: "#333333",
        fontSize: 14,
      },
    ];
  } else if (type === "row") {
    el.children = [
      {
        type: "button",
        id: uid(),
        text: "Left",
        color: "#6200EA",
        textColor: "#FFFFFF",
        fontSize: 14,
        cornerRadius: 20,
      },
      {
        type: "button",
        id: uid(),
        text: "Right",
        color: "#00897B",
        textColor: "#FFFFFF",
        fontSize: 14,
        cornerRadius: 20,
      },
    ];
  }
  elements.push(el);
  render();
}
function removeElement(idx) {
  if (expandedIdx === idx) expandedIdx = -1;
  else if (expandedIdx > idx) expandedIdx--;
  elements.splice(idx, 1);
  render();
}
function toggleExpand(idx) {
  expandedIdx = expandedIdx === idx ? -1 : idx;
  const cards = document.querySelectorAll(".el-card");
  cards.forEach((c, i) => {
    if (i === expandedIdx) c.classList.add("expanded");
    else c.classList.remove("expanded");
  });
}
function onFieldChange(idx, field, value) {
  if (
    field === "fontSize" ||
    field === "height" ||
    field === "width" ||
    field === "cornerRadius" ||
    field === "borderWidth" ||
    field === "paddingH" ||
    field === "paddingV"
  )
    value = parseInt(value) || 0;
  elements[idx][field] = value;
  updatePreview();
}
function onChildField(parentIdx, childIdx, field, value) {
  if (
    field === "fontSize" ||
    field === "cornerRadius" ||
    field === "height" ||
    field === "width" ||
    field === "borderWidth" ||
    field === "paddingH" ||
    field === "paddingV"
  )
    value = parseInt(value) || 0;
  elements[parentIdx].children[childIdx][field] = value;
  updatePreview();
}
function onGrandchildField(parentIdx, childIdx, gcIdx, field, value) {
  if (
    field === "fontSize" ||
    field === "cornerRadius" ||
    field === "height" ||
    field === "width" ||
    field === "borderWidth" ||
    field === "paddingH" ||
    field === "paddingV"
  )
    value = parseInt(value) || 0;
  elements[parentIdx].children[childIdx].children[gcIdx][field] = value;
  updatePreview();
}
function removeGrandchild(pi, ci, gi) {
  elements[pi].children[ci].children.splice(gi, 1);
  render();
}
function toggleGcExpand(pi, ci, gi) {
  const id = "gc-" + pi + "-" + ci + "-" + gi;
  const el = document.getElementById(id);
  if (!el) return;
  const was = el.classList.contains("child-expanded");
  document
    .querySelectorAll(".child-item .child-item")
    .forEach((c) => c.classList.remove("child-expanded"));
  if (!was) {
    el.classList.add("child-expanded");
    expandedGcId = id;
  } else {
    expandedGcId = null;
  }
}
function buildGcEditor(gc, i, ci, gi) {
  const f = (field, val) =>
    `onGrandchildField(${i},${ci},${gi},'${field}',this.value)`;
  let html = "";
  if (gc.type === "text") {
    html += `<div class="field"><label>텍스트</label><input type="text" value="${esc(gc.text || "")}" oninput="${f("text")}"></div>
        <div class="fr"><div class="field"><label>글자 크기</label><input type="number" min="8" max="72" value="${gc.fontSize || 14}" oninput="${f("fontSize")}"></div>
        <div class="field"><label>색상</label><div class="cf"><input type="color" value="${gc.color || "#000000"}" oninput="${f("color")}"><code>${(gc.color || "#000000").toUpperCase()}</code></div></div></div>
        <div class="fr"><div class="field"><label>좌우 안쪽 여백</label><input type="number" min="0" max="50" value="${gc.paddingH || 0}" oninput="${f("paddingH")}"></div>
        <div class="field"><label>상하 안쪽 여백</label><input type="number" min="0" max="50" value="${gc.paddingV || 0}" oninput="${f("paddingV")}"></div></div>`;
  } else if (gc.type === "button") {
    html += `<div class="field"><label>버튼 문구</label><input type="text" value="${esc(gc.text || "")}" oninput="${f("text")}"></div>
        <div class="field"><label>액션</label><input type="text" value="${esc(gc.actionName || "")}" oninput="${f("actionName")}" placeholder="예: navigate:detail"></div>
        <div class="fr"><div class="field"><label>글자 크기</label><input type="number" min="8" max="72" value="${gc.fontSize || 14}" oninput="${f("fontSize")}"></div>
        <div class="field"><label>모서리 반경</label><input type="number" min="0" max="50" value="${gc.cornerRadius || 20}" oninput="${f("cornerRadius")}"></div></div>
        <div class="fr"><div class="field"><label>배경색</label><div class="cf"><input type="color" value="${gc.color || "#6200EA"}" oninput="${f("color")}"><code>${(gc.color || "#6200EA").toUpperCase()}</code></div></div>
        <div class="field"><label>글자 색상</label><div class="cf"><input type="color" value="${gc.textColor || "#FFFFFF"}" oninput="${f("textColor")}"><code>${(gc.textColor || "#FFFFFF").toUpperCase()}</code></div></div></div>
        <div class="fr"><div class="field"><label>테두리 색상</label><div class="cf"><input type="color" value="${gc.borderColor || "#000000"}" oninput="${f("borderColor")}"><code>${(gc.borderColor || "").toUpperCase() || "없음"}</code></div></div>
        <div class="field"><label>테두리 두께</label><input type="number" min="0" max="10" value="${gc.borderWidth || 0}" oninput="${f("borderWidth")}"></div></div>`;
  } else if (gc.type === "spacer") {
    html += `<div class="field"><label>높이 (dp)</label><input type="number" min="1" max="200" value="${gc.height || 16}" oninput="${f("height")}"></div>`;
  } else if (gc.type === "hspacer") {
    html += `<div class="field"><label>너비 (dp)</label><input type="number" min="1" max="200" value="${gc.width || 16}" oninput="${f("width")}"></div>`;
  } else if (gc.type === "divider") {
    html += `<div class="fr"><div class="field"><label>높이</label><input type="number" min="1" max="10" value="${gc.height || 1}" oninput="${f("height")}"></div>
        <div class="field"><label>색상</label><div class="cf"><input type="color" value="${gc.color || "#CCCCCC"}" oninput="${f("color")}"><code>${(gc.color || "#CCCCCC").toUpperCase()}</code></div></div></div>`;
  } else if (gc.type === "card") {
    html += `<div class="fr"><div class="field"><label>배경색</label><div class="cf"><input type="color" value="${gc.color || "#FFFFFF"}" oninput="${f("color")}"><code>${(gc.color || "#FFFFFF").toUpperCase()}</code></div></div>
        <div class="field"><label>모서리 반경</label><input type="number" min="0" max="50" value="${gc.cornerRadius || 0}" oninput="${f("cornerRadius")}"></div></div>
        <div class="fr"><div class="field"><label>좌우 안쪽 여백</label><input type="number" min="0" max="50" value="${gc.paddingH || 0}" oninput="${f("paddingH")}"></div>
        <div class="field"><label>상하 안쪽 여백</label><input type="number" min="0" max="50" value="${gc.paddingV || 0}" oninput="${f("paddingV")}"></div></div>`;
  }
  return (
    html ||
    '<div style="font-size:11px;color:#999">편집 가능한 속성이 없습니다</div>'
  );
}
function addChild(parentIdx, type) {
  const ch = { type, id: uid() };
  if (type === "text") {
    ch.text = "New text";
    ch.color = "#333333";
    ch.fontSize = 14;
  } else if (type === "button") {
    ch.text = "Button";
    ch.color = "#6200EA";
    ch.textColor = "#FFFFFF";
    ch.fontSize = 14;
    ch.cornerRadius = 20;
  } else if (type === "spacer") {
    ch.height = 16;
  } else if (type === "hspacer") {
    ch.width = 16;
  } else if (type === "divider") {
    ch.color = "#CCCCCC";
    ch.height = 1;
  } else if (type === "card") {
    ch.color = "#FFFFFF";
    ch.cornerRadius = 0;
    ch.paddingH = 14;
    ch.paddingV = 10;
    ch.children = [];
  }
  if (!elements[parentIdx].children) elements[parentIdx].children = [];
  elements[parentIdx].children.push(ch);
  render();
}
function removeChild(parentIdx, childIdx) {
  elements[parentIdx].children.splice(childIdx, 1);
  render();
}

let childDragInfo = null;
function onDragStart(e, idx) {
  dragIdx = idx;
  childDragInfo = null;
  e.dataTransfer.effectAllowed = "move";
  e.currentTarget.classList.add("dragging");
}
function onDragEnd() {
  dragIdx = null;
  document
    .querySelectorAll(".el-card")
    .forEach((c) => c.classList.remove("dragging", "drag-over"));
}
function onDragOver(e, idx) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  document
    .querySelectorAll(".el-card")
    .forEach((c) => c.classList.remove("drag-over"));
  e.currentTarget.closest(".el-card")?.classList.add("drag-over");
}
function onDrop(e, idx) {
  e.preventDefault();
  if (dragIdx === null || dragIdx === idx) return;
  const m = elements.splice(dragIdx, 1)[0];
  elements.splice(idx, 0, m);
  dragIdx = null;
  render();
}

function onChildDragStart(e, pi, ci) {
  e.stopPropagation();
  e.stopImmediatePropagation();
  childDragInfo = { type: "child", pi, ci };
  dragIdx = null;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
  e.currentTarget.classList.add("dragging");
}
function onChildDragEnd(e) {
  childDragInfo = null;
  document
    .querySelectorAll(".child-item")
    .forEach((c) => c.classList.remove("dragging", "drag-over"));
}
function onChildDragOver(e, pi, ci) {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = "move";
  document
    .querySelectorAll(".child-item")
    .forEach((c) => c.classList.remove("drag-over"));
  e.currentTarget.closest(".child-item")?.classList.add("drag-over");
}
function onChildDrop(e, pi, ci) {
  e.preventDefault();
  e.stopPropagation();
  if (
    !childDragInfo ||
    childDragInfo.type !== "child" ||
    childDragInfo.pi !== pi ||
    childDragInfo.ci === ci
  )
    return;
  const arr = elements[pi].children;
  const m = arr.splice(childDragInfo.ci, 1)[0];
  arr.splice(ci, 0, m);
  childDragInfo = null;
  render();
}

function onGcDragStart(e, pi, ci, gi) {
  e.stopPropagation();
  e.stopImmediatePropagation();
  childDragInfo = { type: "gc", pi, ci, gi };
  dragIdx = null;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
  e.currentTarget.classList.add("dragging");
}
function onGcDragOver(e, pi, ci, gi) {
  e.preventDefault();
  e.stopPropagation();
  e.dataTransfer.dropEffect = "move";
  document
    .querySelectorAll(".child-item .child-item")
    .forEach((c) => c.classList.remove("drag-over"));
  e.currentTarget.closest(".child-item")?.classList.add("drag-over");
}
function onGcDrop(e, pi, ci, gi) {
  e.preventDefault();
  e.stopPropagation();
  if (
    !childDragInfo ||
    childDragInfo.type !== "gc" ||
    childDragInfo.pi !== pi ||
    childDragInfo.ci !== ci ||
    childDragInfo.gi === gi
  )
    return;
  const arr = elements[pi].children[ci].children;
  const m = arr.splice(childDragInfo.gi, 1)[0];
  arr.splice(gi, 0, m);
  childDragInfo = null;
  render();
}

function render() {
  const list = document.getElementById("elementList");
  document.getElementById("elCount").textContent =
    "요소 " + elements.length + "개";
  if (!elements.length) {
    list.innerHTML =
      '<div class="empty-state"><span class="material-icons-round">add_circle_outline</span><p>아직 요소가 없습니다. 위에서 추가해 보세요.</p></div>';
    updatePreview();
    return;
  }
  list.innerHTML = elements
    .map((el, i) => {
      const badge = `<span class="badge ${el.type}">${elementLabels[el.type] || el.type}</span>`;
      let summary = "";
      if (el.type === "text") summary = el.text || "내용 없음";
      else if (el.type === "button") summary = el.text || "버튼";
      else if (el.type === "spacer") summary = (el.height || 16) + "dp";
      else if (el.type === "hspacer") summary = (el.width || 16) + "dp 너비";
      else if (el.type === "divider") summary = "구분선";
      else if (el.type === "card")
        summary =
          (el.children?.length || 0) +
          "개 하위 요소" +
          (el.actionName ? " (클릭 가능)" : "");
      else if (el.type === "row")
        summary = (el.children?.length || 0) + "개 항목";
      else if (el.type === "icon") summary = el.text || "아이콘";
      let editor = buildEditor(el, i);
      return `<div class="el-card" draggable="true" ondragstart="onDragStart(event,${i})" ondragend="onDragEnd()" ondragover="onDragOver(event,${i})" ondrop="onDrop(event,${i})">
            <div class="el-handle"><span class="material-icons-round">drag_indicator</span></div>
            <div class="el-body">
                <div class="el-top" role="button" tabindex="0" onclick="toggleExpand(${i})" style="cursor:pointer">${badge}<span class="el-summary">${esc(summary)}</span></div>
                <div class="el-editor">${editor}</div>
            </div>
            <div class="el-actions"><button class="del" onclick="event.stopPropagation();removeElement(${i})" title="삭제"><span class="material-icons-round">close</span></button></div>
        </div>`;
    })
    .join("");
  if (expandedIdx >= 0 && expandedIdx < elements.length) {
    document
      .querySelectorAll(".el-card")
      [expandedIdx]?.classList.add("expanded");
  }
  if (expandedChildId) {
    const ce = document.getElementById(expandedChildId);
    if (ce) ce.classList.add("child-expanded");
  }
  if (expandedGcId) {
    const ge = document.getElementById(expandedGcId);
    if (ge) ge.classList.add("child-expanded");
  }
  updatePreview();
}

function buildEditor(el, i) {
  if (el.type === "text")
    return `
        <div class="field"><label>텍스트</label><input type="text" value="${esc(el.text || "")}" oninput="onFieldChange(${i},'text',this.value)"></div>
        <div class="fr"><div class="field"><label>글자 크기</label><input type="number" min="8" max="72" value="${el.fontSize || 16}" oninput="onFieldChange(${i},'fontSize',this.value)"></div>
        <div class="field"><label>색상</label><div class="cf"><input type="color" value="${el.color || "#000000"}" oninput="onFieldChange(${i},'color',this.value)"><code>${(el.color || "#000000").toUpperCase()}</code></div></div></div>
        <div class="fr"><div class="field"><label>좌우 안쪽 여백</label><input type="number" min="0" max="50" value="${el.paddingH || 0}" oninput="onFieldChange(${i},'paddingH',this.value)"></div>
        <div class="field"><label>상하 안쪽 여백</label><input type="number" min="0" max="50" value="${el.paddingV || 0}" oninput="onFieldChange(${i},'paddingV',this.value)"></div></div>`;
  if (el.type === "button")
    return `
        <div class="field"><label>버튼 문구</label><input type="text" value="${esc(el.text || "")}" oninput="onFieldChange(${i},'text',this.value)"></div>
        <div class="field"><label>액션 이름</label><input type="text" value="${esc(el.actionName || "")}" oninput="onFieldChange(${i},'actionName',this.value)" placeholder="예: open_settings"></div>
        <div class="fr"><div class="field"><label>글자 크기</label><input type="number" min="8" max="72" value="${el.fontSize || 16}" oninput="onFieldChange(${i},'fontSize',this.value)"></div>
        <div class="field"><label>모서리 반경</label><input type="number" min="0" max="50" value="${el.cornerRadius || 24}" oninput="onFieldChange(${i},'cornerRadius',this.value)"></div></div>
        <div class="fr"><div class="field"><label>배경색</label><div class="cf"><input type="color" value="${el.color || "#6200EA"}" oninput="onFieldChange(${i},'color',this.value)"><code>${(el.color || "#6200EA").toUpperCase()}</code></div></div>
        <div class="field"><label>글자 색상</label><div class="cf"><input type="color" value="${el.textColor || "#FFFFFF"}" oninput="onFieldChange(${i},'textColor',this.value)"><code>${(el.textColor || "#FFFFFF").toUpperCase()}</code></div></div>
        <div class="field"><label>테두리 색상</label><div class="cf"><input type="color" value="${el.borderColor || "#000000"}" oninput="onFieldChange(${i},'borderColor',this.value)"><code>${(el.borderColor || "").toUpperCase() || "없음"}</code></div></div></div>
        <div class="fr"><div class="field"><label>테두리 두께</label><input type="number" min="0" max="10" value="${el.borderWidth || 0}" oninput="onFieldChange(${i},'borderWidth',this.value)"></div></div>`;
  if (el.type === "spacer")
    return `<div class="field"><label>높이 (dp)</label><input type="number" min="1" max="200" value="${el.height || 16}" oninput="onFieldChange(${i},'height',this.value)"></div>`;
  if (el.type === "divider")
    return `<div class="fr"><div class="field"><label>높이</label><input type="number" min="1" max="10" value="${el.height || 1}" oninput="onFieldChange(${i},'height',this.value)"></div><div class="field"><label>색상</label><div class="cf"><input type="color" value="${el.color || "#CCCCCC"}" oninput="onFieldChange(${i},'color',this.value)"><code>${(el.color || "#CCCCCC").toUpperCase()}</code></div></div></div>`;
  if (el.type === "card")
    return `
        <div class="fr"><div class="field"><label>배경색</label><div class="cf"><input type="color" value="${el.color || "#FFFFFF"}" oninput="onFieldChange(${i},'color',this.value)"><code>${(el.color || "#FFFFFF").toUpperCase()}</code></div></div>
        <div class="field"><label>모서리 반경</label><input type="number" min="0" max="50" value="${el.cornerRadius || 16}" oninput="onFieldChange(${i},'cornerRadius',this.value)"></div></div>
        <div class="fr"><div class="field"><label>테두리 색상</label><div class="cf"><input type="color" value="${el.borderColor || "#CCCCCC"}" oninput="onFieldChange(${i},'borderColor',this.value)"><code>${(el.borderColor || "").toUpperCase() || "없음"}</code></div></div>
        <div class="field"><label>테두리 두께</label><input type="number" min="0" max="10" value="${el.borderWidth || 0}" oninput="onFieldChange(${i},'borderWidth',this.value)"></div></div>
        <div class="field"><label>액션 (선택)</label><input type="text" value="${esc(el.actionName || "")}" oninput="onFieldChange(${i},'actionName',this.value)" placeholder="클릭 시 실행할 액션을 입력하세요"></div>
        ${childrenEditor(el, i, "text")}`;
  if (el.type === "row") return childrenEditor(el, i, "button");
  if (el.type === "icon")
    return `
        <div class="field"><label>아이콘 이름</label><input type="text" value="${esc(el.text || "")}" oninput="onFieldChange(${i},'text',this.value)" placeholder="content_copy, more_vert"></div>
        <div class="fr"><div class="field"><label>글자 크기</label><input type="number" min="12" max="48" value="${el.fontSize || 24}" oninput="onFieldChange(${i},'fontSize',this.value)"></div>
        <div class="field"><label>색상</label><div class="cf"><input type="color" value="${el.color || "#333333"}" oninput="onFieldChange(${i},'color',this.value)"><code>${(el.color || "#333333").toUpperCase()}</code></div></div></div>
        <div class="field"><label>액션</label><input type="text" value="${esc(el.actionName || "")}" oninput="onFieldChange(${i},'actionName',this.value)"></div>`;
  return "";
}

function childrenEditor(el, i, defaultChild) {
  const children = el.children || [];
  let html =
    '<div class="children-area" onclick="event.stopPropagation()"><div class="child-label"><span>하위 요소 (' +
    children.length +
    ')</span><div style="display:flex;gap:4px">';
  html +=
    '<button class="btn btn-o btn-s" onclick="event.stopPropagation();addChild(' +
    i +
    ",'text')\">텍스트</button>";
  html +=
    '<button class="btn btn-o btn-s" onclick="event.stopPropagation();addChild(' +
    i +
    ",'button')\">버튼</button>";
  html +=
    '<button class="btn btn-o btn-s" onclick="event.stopPropagation();addChild(' +
    i +
    ",'spacer')\">세로 여백</button>";
  html +=
    '<button class="btn btn-o btn-s" onclick="event.stopPropagation();addChild(' +
    i +
    ",'hspacer')\">가로 여백</button>";
  html +=
    '<button class="btn btn-o btn-s" onclick="event.stopPropagation();addChild(' +
    i +
    ",'divider')\">구분선</button>";
  html +=
    '<button class="btn btn-o btn-s" onclick="event.stopPropagation();addChild(' +
    i +
    ",'card')\">카드</button>";
  html += "</div></div>";
  children.forEach((ch, ci) => {
    const summary = ch.text || elementLabels[ch.type] || ch.type;
    html += `<div class="child-item" id="child-${i}-${ci}" style="display:flex;align-items:stretch" draggable="true" ondragstart="onChildDragStart(event,${i},${ci})" ondragend="onChildDragEnd(event)" ondragover="onChildDragOver(event,${i},${ci})" ondrop="onChildDrop(event,${i},${ci})">`;
    html += `<div style="flex:1;min-width:0">`;
    html += `<div class="child-hdr" role="button" tabindex="0" onclick="toggleChildExpand(${i},${ci})"><span class="badge ${ch.type}">${elementLabels[ch.type] || ch.type}</span><span class="child-summary">${esc(summary)}</span></div>`;
    html += `<div class="child-editor">${buildChildEditor(ch, i, ci)}</div>`;
    html += `</div>`;
    html += `<button class="child-del-btn" onclick="event.stopPropagation();removeChild(${i},${ci})" title="삭제" style="align-self:flex-start;margin:6px 4px 0 0"><span class="material-icons-round" style="font-size:16px">close</span></button>`;
    html += `</div>`;
  });
  html += "</div>";
  return html;
}

function buildChildEditor(ch, i, ci) {
  let html = "";
  if (ch.type === "text") {
    html += `<div class="field"><label>텍스트</label><input type="text" value="${esc(ch.text || "")}" oninput="onChildField(${i},${ci},'text',this.value)"></div>
        <div class="fr"><div class="field"><label>글자 크기</label><input type="number" min="8" max="72" value="${ch.fontSize || 14}" oninput="onChildField(${i},${ci},'fontSize',this.value)"></div>
        <div class="field"><label>색상</label><div class="cf"><input type="color" value="${ch.color || "#000000"}" oninput="onChildField(${i},${ci},'color',this.value)"><code>${(ch.color || "#000000").toUpperCase()}</code></div></div></div>`;
  } else if (ch.type === "button") {
    html += `<div class="field"><label>버튼 문구</label><input type="text" value="${esc(ch.text || "")}" oninput="onChildField(${i},${ci},'text',this.value)"></div>
        <div class="field"><label>액션</label><input type="text" value="${esc(ch.actionName || "")}" oninput="onChildField(${i},${ci},'actionName',this.value)" placeholder="예: navigate:detail"></div>
        <div class="fr"><div class="field"><label>글자 크기</label><input type="number" min="8" max="72" value="${ch.fontSize || 14}" oninput="onChildField(${i},${ci},'fontSize',this.value)"></div>
        <div class="field"><label>모서리 반경</label><input type="number" min="0" max="50" value="${ch.cornerRadius || 20}" oninput="onChildField(${i},${ci},'cornerRadius',this.value)"></div></div>
        <div class="fr"><div class="field"><label>배경색</label><div class="cf"><input type="color" value="${ch.color || "#6200EA"}" oninput="onChildField(${i},${ci},'color',this.value)"><code>${(ch.color || "#6200EA").toUpperCase()}</code></div></div>
        <div class="field"><label>글자 색상</label><div class="cf"><input type="color" value="${ch.textColor || "#FFFFFF"}" oninput="onChildField(${i},${ci},'textColor',this.value)"><code>${(ch.textColor || "#FFFFFF").toUpperCase()}</code></div></div></div>`;
  } else if (ch.type === "spacer") {
    html += `<div class="field"><label>높이 (dp)</label><input type="number" min="1" max="200" value="${ch.height || 16}" oninput="onChildField(${i},${ci},'height',this.value)"></div>`;
  } else if (ch.type === "hspacer") {
    html += `<div class="field"><label>너비 (dp)</label><input type="number" min="1" max="200" value="${ch.width || 16}" oninput="onChildField(${i},${ci},'width',this.value)"></div>`;
  } else if (ch.type === "divider") {
    html += `<div class="fr"><div class="field"><label>높이</label><input type="number" min="1" max="10" value="${ch.height || 1}" oninput="onChildField(${i},${ci},'height',this.value)"></div>
        <div class="field"><label>색상</label><div class="cf"><input type="color" value="${ch.color || "#CCCCCC"}" oninput="onChildField(${i},${ci},'color',this.value)"><code>${(ch.color || "#CCCCCC").toUpperCase()}</code></div></div></div>`;
  } else if (ch.type === "card") {
    html += `<div class="fr"><div class="field"><label>배경색</label><div class="cf"><input type="color" value="${ch.color || "#FFFFFF"}" oninput="onChildField(${i},${ci},'color',this.value)"><code>${(ch.color || "#FFFFFF").toUpperCase()}</code></div></div>
        <div class="field"><label>모서리 반경</label><input type="number" min="0" max="50" value="${ch.cornerRadius || 0}" oninput="onChildField(${i},${ci},'cornerRadius',this.value)"></div></div>
        <div class="fr"><div class="field"><label>좌우 안쪽 여백</label><input type="number" min="0" max="50" value="${ch.paddingH || 0}" oninput="onChildField(${i},${ci},'paddingH',this.value)"></div>
        <div class="field"><label>상하 안쪽 여백</label><input type="number" min="0" max="50" value="${ch.paddingV || 0}" oninput="onChildField(${i},${ci},'paddingV',this.value)"></div></div>`;
    if (ch.children && ch.children.length) {
      html += `<div style="margin-top:8px;padding:8px;background:var(--surface);border:1px dashed var(--outline);border-radius:6px" onclick="event.stopPropagation()">`;
      html += `<div style="font-size:10px;font-weight:600;color:var(--ts);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">중첩 요소 (${ch.children.length})</div>`;
      ch.children.forEach((gc, gi) => {
        const gcSummary =
          gc.text ||
          (elementLabels[gc.type] || gc.type) +
            " " +
            (gc.height ? gc.height + "dp" : "");
        html += `<div class="child-item" id="gc-${i}-${ci}-${gi}" style="display:flex;align-items:stretch" draggable="true" ondragstart="onGcDragStart(event,${i},${ci},${gi})" ondragend="onChildDragEnd(event)" ondragover="onGcDragOver(event,${i},${ci},${gi})" ondrop="onGcDrop(event,${i},${ci},${gi})">`;
        html += `<div style="flex:1;min-width:0">`;
        html += `<div class="child-hdr" role="button" tabindex="0" onclick="event.stopPropagation();toggleGcExpand(${i},${ci},${gi})"><span class="badge ${gc.type}">${elementLabels[gc.type] || gc.type}</span><span class="child-summary">${esc(gcSummary)}</span></div>`;
        html += `<div class="child-editor" onclick="event.stopPropagation()">${buildGcEditor(gc, i, ci, gi)}</div>`;
        html += `</div>`;
        html += `<button class="child-del-btn" onclick="event.stopPropagation();removeGrandchild(${i},${ci},${gi})" title="삭제" style="align-self:flex-start;margin:6px 4px 0 0"><span class="material-icons-round" style="font-size:16px">close</span></button>`;
        html += `</div>`;
      });
      html += `</div>`;
    }
  }
  return (
    html ||
    '<div style="font-size:11px;color:#999">편집 가능한 속성이 없습니다</div>'
  );
}

function toggleChildExpand(parentIdx, childIdx) {
  const id = "child-" + parentIdx + "-" + childIdx;
  const el = document.getElementById(id);
  if (!el) return;
  const wasExpanded = el.classList.contains("child-expanded");
  document
    .querySelectorAll(".child-item")
    .forEach((c) => c.classList.remove("child-expanded"));
  expandedGcId = null;
  if (!wasExpanded) {
    el.classList.add("child-expanded");
    expandedChildId = id;
  } else {
    expandedChildId = null;
  }
}

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
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
    o.fontSize = el.fontSize || 16;
  } else if (el.type === "button") {
    o.text = el.text;
    o.color = (el.color || "#6200EA").toUpperCase();
    o.textColor = (el.textColor || "#FFFFFF").toUpperCase();
    o.fontSize = el.fontSize || 16;
    o.cornerRadius = el.cornerRadius != null ? el.cornerRadius : 24;
    if (el.actionName) o.actionName = el.actionName;
    if (el.borderColor && el.borderWidth) {
      o.borderColor = el.borderColor.toUpperCase();
      o.borderWidth = el.borderWidth;
    }
  } else if (el.type === "spacer") {
    o.height = el.height || 16;
  } else if (el.type === "hspacer") {
    o.width = el.width || 16;
  } else if (el.type === "divider") {
    o.color = (el.color || "#CCCCCC").toUpperCase();
    o.height = el.height || 1;
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
    o.fontSize = el.fontSize || 24;
    if (el.actionName) o.actionName = el.actionName;
  }
  return o;
}

async function copyJson() {
  const j = JSON.stringify(getConfig(), null, 2);
  try {
    await navigator.clipboard.writeText(j);
  } catch {
    const t = document.createElement("textarea");
    t.value = j;
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    document.body.removeChild(t);
  }
  showToast("JSON을 복사했습니다", "content_copy");
}
async function deployConfig() {
  const token = document.getElementById("ghToken").value.trim();
  if (!token) {
    showToast("먼저 GitHub 토큰을 입력하세요", "warning", true);
    document.getElementById("ghToken").focus();
    return;
  }
  localStorage.setItem("gh_token", token);
  setDeploy("deploying");
  const fp = currentFile();
  try {
    const existing = await fetch(
      `https://api.github.com/repos/${REPO}/${REPO_N}/contents/${fp}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    let sha = null;
    if (existing.ok) sha = (await existing.json()).sha;
    const content = btoa(
      unescape(encodeURIComponent(JSON.stringify(getConfig(), null, 2) + "\n")),
    );
    const body = {
      message:
        "Update " + screens[activeScreen].label + " screen from web editor",
      content,
    };
    if (sha) body.sha = sha;
    const r = await fetch(
      `https://api.github.com/repos/${REPO}/${REPO_N}/contents/${fp}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    if (r.ok) {
      setDeploy("deployed");
      showToast(
        screens[activeScreen].label + " 화면을 배포했습니다",
        "cloud_done",
      );
      pollActionStatus(token);
    } else {
      const e = await r.json();
      setDeploy("err");
      showToast("배포 실패: " + (e.message || r.status), "error", true);
    }
  } catch (e) {
    setDeploy("err");
    showToast("배포 실패: " + e.message, "error", true);
  }
}

let deployTimer = null;
let deployStartTime = 0;
function setDeploy(s) {
  const b = document.getElementById("deployStatus"),
    t = document.getElementById("deployStatusText");
  if (s === "deploying") {
    stopDeployTimer();
    b.className = "sb";
    t.textContent = "배포 중...";
  } else if (s === "deployed") {
    b.className = "sb ok";
    t.textContent = "배포 완료 \u2713";
    deployStartTime = Date.now();
    startDeployTimer();
  } else if (s === "action_done") {
    stopDeployTimer();
    b.className = "sb ok";
    t.textContent = "\u2713 바이너리 준비 완료";
    showToast("바이너리 .rc 파일을 생성했습니다", "check_circle");
    setTimeout(() => {
      b.className = "sb";
      t.textContent = "준비됨";
    }, 8000);
  } else if (s === "action_fail") {
    stopDeployTimer();
    b.className = "sb err";
    t.textContent = "\u2717 자동 빌드 실패";
    setTimeout(() => {
      b.className = "sb";
      t.textContent = "준비됨";
    }, 8000);
  } else if (s === "err") {
    stopDeployTimer();
    b.className = "sb err";
    t.textContent = "실패";
    setTimeout(() => {
      b.className = "sb";
      t.textContent = "준비됨";
    }, 5000);
  } else {
    stopDeployTimer();
    b.className = "sb";
    t.textContent = "준비됨";
  }
}
function startDeployTimer() {
  stopDeployTimer();
  deployTimer = setInterval(() => {
    const b = document.getElementById("deployStatus"),
      t = document.getElementById("deployStatusText");
    const elapsed = Math.round((Date.now() - deployStartTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const timeStr = mins > 0 ? mins + "분 " + secs + "초" : secs + "초";
    b.className = "sb action";
    t.textContent = "\u2699 바이너리 생성 중... " + timeStr;
  }, 1000);
}
function stopDeployTimer() {
  if (deployTimer) {
    clearInterval(deployTimer);
    deployTimer = null;
  }
}

async function pollActionStatus(token) {
  await new Promise((r) => setTimeout(r, 8000));
  const wfFile = "convert.yml";
  for (let i = 0; i < 60; i++) {
    try {
      const resp = await fetch(
        `https://api.github.com/repos/${REPO}/${REPO_N}/actions/workflows/${wfFile}/runs?per_page=1`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!resp.ok) break;
      const data = await resp.json();
      const run = data.workflow_runs?.[0];
      if (!run) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      if (run.status === "completed") {
        if (run.conclusion === "success") {
          const finishedAt = new Date(run.updated_at).getTime();
          if (finishedAt > deployStartTime) {
            setDeploy("action_done");
            return;
          }
        } else {
          const finishedAt = new Date(run.updated_at).getTime();
          if (finishedAt > deployStartTime) {
            setDeploy("action_fail");
            return;
          }
        }
      }
    } catch (e) {
      break;
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  stopDeployTimer();
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
