import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { JSDOM, VirtualConsole } from "jsdom";

function editor(t) {
  const errors = [];
  const console = new VirtualConsole();
  console.on("jsdomError", (error) => errors.push(error.message));
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
    .replace(/src="preview\/[^\"]*"/, "");
  const dom = new JSDOM(html, {
    url: "https://editor.test/",
    runScripts: "dangerously",
    virtualConsole: console,
  });
  const w = dom.window,
    d = w.document;
  t.after(() => {
    dom.window.close();
    assert.deepEqual(errors, []);
  });
  for (const name of ["sample-data.js", "editor.js"]) {
    vm.runInContext(
      readFileSync(
        new URL(`../assets/${name}`, import.meta.url),
        "utf8",
      ).replace(/init\(\);\s*$/, ""),
      dom.getInternalVMContext(),
    );
  }
  w.resetToDefaults();
  const config = () => JSON.parse(JSON.stringify(w.getConfig()));
  const root = () => [...d.querySelectorAll("#elementList > .el-card")];
  const field = (node, name, value) => {
    const input = node.querySelector(`[data-field="${name}"]`);
    assert.ok(input, name);
    input.value = String(value);
    input.dispatchEvent(new w.Event("input", { bubbles: true }));
  };
  const event = (type, node, dataTransfer = {}) => {
    const e = new w.Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(e, "dataTransfer", {
      value: { setData() {}, ...dataTransfer },
    });
    node.dispatchEvent(e);
    return e;
  };
  return { w, d, root, config, field, event };
}

test("real inline delete buttons remove children, grandchildren and root elements", (t) => {
  const { w, d, root, config } = editor(t);
  const parentIndex = config().elements.findIndex((e) => e.type === "card");
  const card = root()[parentIndex];
  const before = config().elements[parentIndex].children.length;
  card.querySelector(".child-del-btn").click();
  assert.equal(config().elements[parentIndex].children.length, before - 1);
  w.addNestedElement([parentIndex], "card");
  const ci = config().elements[parentIndex].children.length - 1;
  w.addNestedElement([parentIndex, ci], "text");
  root()
    [parentIndex].querySelectorAll(".child-item")
    [ci].querySelector(".child-item .child-del-btn")
    .click();
  assert.deepEqual(
    config().elements[parentIndex].children[ci].children || [],
    [],
  );
  const length = root().length;
  root()[parentIndex].querySelector(".el-actions button").click();
  assert.equal(root().length, length - 1);
});

test("every exposed add button works, including adding content inside a new nested card", (t) => {
  const { d, root, config } = editor(t);
  for (const button of d.querySelectorAll(".add-bar button")) {
    const before = root().length;
    button.click();
    assert.equal(root().length, before + 1);
  }
  let rowIndex = root().length - 1;
  for (let i = 0; i < 6; i++) {
    const before = config().elements[rowIndex].children.length;
    root()
      [rowIndex].querySelectorAll(".children-area > .child-label button")
      [i].click();
    assert.equal(config().elements[rowIndex].children.length, before + 1);
  }
  const nestedCard = root()[rowIndex].querySelector(".child-item:last-child");
  nestedCard.querySelector(".child-label button").click();
  assert.equal(
    config().elements[rowIndex].children.at(-1).children[0].type,
    "text",
  );
});

test("quoted text, action names, zero radii and color labels survive edits and rerenders", (t) => {
  const { w, root, config, field } = editor(t);
  w.addElement("button");
  const index = root().length - 1,
    value = "한글 \"따옴표\" & <태그> '문구'";
  field(root()[index], "text", value);
  field(root()[index], "actionName", 'navigate:"detail"');
  field(root()[index], "cornerRadius", 0);
  field(root()[index], "color", "#123456");
  field(root()[index], "borderWidth", 3);
  assert.equal(root()[index].querySelector(".el-summary").textContent, value);
  assert.equal(
    root()[index].querySelector('[data-field="color"]').nextElementSibling
      .textContent,
    "#123456",
  );
  assert.equal(config().elements[index].borderColor, "#000000");
  w.render();
  assert.equal(root()[index].querySelector('[data-field="text"]').value, value);
  assert.equal(
    root()[index].querySelector('[data-field="cornerRadius"]').value,
    "0",
  );
  assert.equal(config().elements[index].actionName, 'navigate:"detail"');
});

test("nested fields include working borders, action, text and spacing controls at every depth", (t) => {
  const { w, root, config, field } = editor(t);
  w.addElement("card");
  const i = root().length - 1;
  w.addNestedElement([i], "card");
  w.addNestedElement([i, 1], "button");
  let button = root()[i].querySelectorAll(".child-item")[2];
  field(button, "borderWidth", 4);
  field(button, "text", "깊은 요소");
  field(button, "paddingH", 0);
  field(button, "cornerRadius", 0);
  w.render();
  const actual = config().elements[i].children[1].children[0];
  assert.equal(actual.borderWidth, 4);
  assert.equal(actual.paddingH, 0);
  assert.equal(actual.cornerRadius, 0);
  assert.equal(actual.text, "깊은 요소");
});

test("keyboard expansion and editing focus follow element identity after reordering/deletion", (t) => {
  const { w, d, root, event, config } = editor(t);
  root()[1]
    .querySelector("[role=button]")
    .dispatchEvent(
      new w.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
  const id = config().elements[1].id;
  assert.equal(
    root()[1].querySelector("[role=button]").getAttribute("aria-expanded"),
    "true",
  );
  event("dragstart", root()[1]);
  event("dragover", root()[3]);
  event("drop", root()[3]);
  assert.equal(config().elements[3].id, id);
  assert.ok(root()[3].classList.contains("expanded"));
  root()[0].querySelector(".del").click();
  assert.equal(config().elements[2].id, id);
  assert.ok(root()[2].classList.contains("expanded"));
  root()[2]
    .querySelector("[role=button]")
    .dispatchEvent(new w.KeyboardEvent("keydown", { key: " ", bubbles: true }));
  assert.ok(!root()[2].classList.contains("expanded"));
  assert.equal(d.querySelectorAll(".dragging,.drag-over").length, 0);
});

test("child/grandchild dragging reorders only siblings without moving parents", (t) => {
  const { w, root, config, event } = editor(t);
  w.addElement("card");
  const i = root().length - 1;
  w.addNestedElement([i], "card");
  w.addNestedElement([i, 1], "text");
  w.addNestedElement([i, 1], "button");
  let items = root()[i].querySelectorAll(".child-item");
  const original = config().elements[i].children[1].children.map((e) => e.id);
  event("dragstart", items[2]);
  event("drop", items[3]);
  assert.deepEqual(
    config().elements[i].children[1].children.map((e) => e.id),
    original.reverse(),
  );
  const ids = config().elements.map((e) => e.id);
  items = root()[i].querySelectorAll(".child-item");
  event("dragstart", items[0]);
  event("drop", root()[0]);
  assert.deepEqual(
    config().elements.map((e) => e.id),
    ids,
  );
  event("dragstart", items[0]);
  event("drop", items[1]);
  assert.equal(config().elements[i].children[0].type, "card");
});

test("screen switching preserves edits and reset restores all screen settings", (t) => {
  const { w, d, config, root, field } = editor(t);
  field(root()[0], "text", "편집 유지");
  d.getElementById("bgColor").value = "#112233";
  w.onBackgroundChange();
  w.switchScreen("detail");
  w.switchScreen("home");
  assert.equal(config().elements[0].text, "편집 유지");
  assert.equal(config().backgroundColor, "#112233");
  w.eval("screens.home.scrollable=true; screens.home.padding=42");
  d.querySelector('[onclick="resetToDefaults()"]').click();
  assert.equal(config().backgroundColor, "#F5F0FF");
  assert.equal(config().scrollable, undefined);
  assert.equal(config().padding, undefined);
});

test("late config responses cannot overwrite edits or reset and duplicate imported IDs are repaired", async (t) => {
  const { w, config, root, field } = editor(t);
  let resolve;
  w.fetch = () =>
    new Promise((r) => {
      resolve = r;
    });
  const pending = w.fetchScreen("home");
  field(root()[0], "text", "보존");
  resolve({ ok: true, json: async () => ({ elements: [] }) });
  await pending;
  assert.equal(config().elements[0].text, "보존");
  const pendingReset = w.fetchScreen("home");
  w.resetToDefaults();
  resolve({ ok: true, json: async () => ({ elements: [] }) });
  await pendingReset;
  assert.ok(config().elements.length > 0);
  w.fetch = async () => ({
    ok: true,
    json: async () => ({
      elements: [
        { type: "text", id: "999", text: "a" },
        { type: "text", id: "999", text: "b" },
      ],
    }),
  });
  await w.fetchScreen("home");
  assert.notEqual(config().elements[0].id, config().elements[1].id);
});

test("copy exports current Unicode JSON and reports clipboard failure honestly", async (t) => {
  const { w, d, config } = editor(t);
  let copied;
  Object.defineProperty(w.navigator, "clipboard", {
    value: {
      writeText: async (text) => {
        copied = text;
      },
    },
    configurable: true,
  });
  await w.copyJson();
  assert.deepEqual(JSON.parse(copied), config());
  w.navigator.clipboard.writeText = async () => {
    throw new Error("denied");
  };
  d.execCommand = () => false;
  await w.copyJson();
  assert.match(d.getElementById("toastMsg").textContent, /실패/);
  assert.equal(d.querySelectorAll("textarea").length, 0);
});

test("token visibility controls work and missing token prevents deployment", async (t) => {
  const { w, d } = editor(t);
  d.querySelector('[aria-label="토큰 표시"]').click();
  assert.equal(d.getElementById("ghToken").type, "text");
  d.querySelector('[aria-label="토큰 숨기기"]').click();
  assert.equal(d.getElementById("ghToken").type, "password");
  w.fetch = () => assert.fail("must not submit without token");
  await w.deployConfig();
  assert.match(d.getElementById("toastMsg").textContent, /토큰/);
});

test("deployment snapshots the selected screen and blocks duplicate clicks while saving", async (t) => {
  const { w, d, config } = editor(t);
  d.getElementById("ghToken").value = "fake-test-token";
  const before = config();
  let release,
    requests = [];
  w.fetch = async (url, options) => {
    requests.push({ url, ...options });
    if (requests.length === 1)
      return new Promise((r) => {
        release = r;
      });
    return { ok: true, json: async () => ({ commit: { sha: "new-commit" } }) };
  };
  let poll;
  w.pollActionStatus = (...args) => {
    poll = args;
  };
  const pending = w.deployConfig();
  assert.equal(d.getElementById("deployButton").disabled, true);
  await w.deployConfig();
  w.switchScreen("detail");
  release({ ok: true, json: async () => ({ sha: "existing" }) });
  await pending;
  assert.equal(requests.length, 2);
  assert.ok(requests[1].url.endsWith("/config.json"));
  const body = JSON.parse(requests[1].body);
  assert.deepEqual(
    JSON.parse(Buffer.from(body.content, "base64").toString("utf8")),
    before,
  );
  assert.match(body.message, /홈/);
  assert.equal(body.sha, "existing");
  assert.equal(poll[1], "new-commit");
  assert.equal(d.getElementById("deployButton").disabled, false);
});

for (const status of [401, 403, 409, 422])
  test(`deployment reports HTTP ${status} and unlocks retry`, async (t) => {
    const { w, d } = editor(t);
    d.getElementById("ghToken").value = "fake-test-token";
    let calls = 0;
    w.fetch = async () => {
      calls++;
      return {
        ok: false,
        status,
        json: async () => ({ message: "test error" }),
      };
    };
    await w.deployConfig();
    assert.equal(calls, 1);
    assert.match(d.getElementById("toastMsg").textContent, /test error/);
    assert.equal(d.getElementById("deployButton").disabled, false);
  });

test("workflow polling ignores unrelated runs and reports access failures", async (t) => {
  const { w, d } = editor(t);
  w.setTimeout = (callback) => {
    callback();
    return 1;
  };
  let urls = [];
  w.fetch = async (url) => {
    urls.push(url);
    return {
      ok: true,
      json: async () => ({
        workflow_runs: [
          { head_sha: "unrelated", status: "completed", conclusion: "failure" },
          { head_sha: "wanted", status: "completed", conclusion: "failure" },
        ],
      }),
    };
  };
  await w.pollActionStatus("fake", "wanted", 0);
  assert.match(urls[0], /head_sha=wanted/);
  assert.match(
    d.getElementById("deployStatusText").textContent,
    /빌드·배포 실패/,
  );
  w.fetch = async () => ({
    ok: false,
    status: 403,
    json: async () => ({ message: "denied" }),
  });
  await w.pollActionStatus("fake", "wanted", 0);
  assert.match(d.getElementById("deployStatusText").textContent, /확인 불가/);
});

test("preview receives the current screen JSON after nested deletion and background changes", (t) => {
  const { w, d, root, config } = editor(t);
  const sent = [];
  d.getElementById("composePreview").contentWindow.postMessage = (payload) =>
    sent.push(JSON.parse(payload));
  root()[4].querySelector(".child-del-btn").click();
  d.getElementById("bgColor").value = "#123456";
  d.getElementById("bgColor").dispatchEvent(
    new w.Event("input", { bubbles: true }),
  );
  assert.deepEqual(sent.at(-1), config());
  assert.equal(sent.at(-1).elements[4].children.length, 2);
  assert.equal(sent.at(-1).backgroundColor, "#123456");
});

test("editing a parent color does not overwrite child color labels", (t) => {
  const { root, field } = editor(t);
  const child = root()[4].querySelector('.child-item [data-field="color"]');
  const previous = child.nextElementSibling.textContent;
  field(root()[4], "color", "#112233");
  assert.equal(child.nextElementSibling.textContent, previous);
});

test("deployment creates a missing file and reports a failed PUT without polling", async (t) => {
  const { w, d } = editor(t);
  d.getElementById("ghToken").value = "fake-test-token";
  let requests = [];
  w.fetch = async (url, options) => {
    requests.push(options);
    return requests.length === 1
      ? { ok: false, status: 404 }
      : { ok: false, status: 409, json: async () => ({ message: "Conflict" }) };
  };
  w.pollActionStatus = () => assert.fail("failed saves must not poll");
  await w.deployConfig();
  assert.equal(requests[1].method, "PUT");
  assert.equal(JSON.parse(requests[1].body).sha, undefined);
  assert.match(d.getElementById("toastMsg").textContent, /Conflict/);
});

test("network errors unlock deployment and restricted storage does not stop saving", async (t) => {
  const { w, d } = editor(t);
  d.getElementById("ghToken").value = "fake-test-token";
  Object.defineProperty(w, "localStorage", {
    get() {
      throw new Error("storage blocked");
    },
  });
  w.fetch = async () => {
    throw new Error("offline");
  };
  await w.deployConfig();
  assert.match(d.getElementById("toastMsg").textContent, /offline/);
  assert.equal(d.getElementById("deployButton").disabled, false);
});

test("poll timeout is explicit and obsolete polling cannot change a newer deployment", async (t) => {
  const { w, d } = editor(t);
  w.setTimeout = (callback) => {
    callback();
    return 1;
  };
  let calls = 0;
  w.fetch = async () => {
    calls++;
    return { ok: true, json: async () => ({ workflow_runs: [] }) };
  };
  await w.pollActionStatus("fake", "wanted", 0);
  assert.equal(calls, 60);
  assert.match(d.getElementById("deployStatusText").textContent, /시간 초과/);
  const previous = d.getElementById("deployStatusText").textContent;
  await w.pollActionStatus("fake", "wanted", -1);
  assert.equal(calls, 60);
  assert.equal(d.getElementById("deployStatusText").textContent, previous);
});

test("workflow success is attributed only to the saved commit", async (t) => {
  const { w } = editor(t);
  w.setTimeout = (callback) => {
    callback();
    return 1;
  };
  let attempts = 0,
    status;
  w.setDeploy = (value) => {
    status = value;
  };
  w.fetch = async () => ({
    ok: true,
    json: async () => ({
      workflow_runs:
        ++attempts === 1
          ? [{ head_sha: "other", status: "completed", conclusion: "success" }]
          : [{ head_sha: "saved", status: "completed", conclusion: "success" }],
    }),
  });
  await w.pollActionStatus("fake", "saved", 0);
  assert.equal(attempts, 2);
  assert.equal(status, "action_done");
});
