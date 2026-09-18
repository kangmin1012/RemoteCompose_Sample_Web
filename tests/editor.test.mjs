import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

// Run the same browser code with a small DOM stub; no test framework is required.
function editor() {
  const nodes = new Map();
  const context = vm.createContext({
    btoa,
    localStorage: { setItem() {} },
    document: {
      getElementById(id) {
        if (!nodes.has(id))
          nodes.set(id, {
            value: "#FFFFFF",
            classList: { add() {}, remove() {} },
          });
        return nodes.get(id);
      },
      querySelectorAll: () => [],
    },
  });
  for (const name of ["sample-data.js", "editor.js"]) {
    const source = readFileSync(
      new URL(`../assets/${name}`, import.meta.url),
      "utf8",
    );
    vm.runInContext(source.replace(/init\(\);\s*$/, ""), context);
  }
  vm.runInContext("render = () => {}; showToast = () => {};", context);
  return (script) => vm.runInContext(script, context);
}

test("serialization preserves nested layout, styling and navigation metadata", () => {
  const run = editor();
  const card = {
    type: "card",
    id: "1",
    align: "start",
    paddingH: 0,
    paddingV: 8,
    color: "#FFFFFF",
    cornerRadius: 0,
    borderColor: "#123456",
    borderWidth: 2,
    actionName: "navigate:detail",
    children: [
      {
        type: "text",
        id: "2",
        text: "안녕하세요",
        color: "#ABCDEF",
        fontSize: 18,
      },
    ],
  };
  assert.deepEqual(
    JSON.parse(run(`JSON.stringify(cleanEl(${JSON.stringify(card)}))`)),
    card,
  );
});

test("Reset restores both editable screens without referencing missing screens", () => {
  const run = editor();
  run("resetToDefaults(); addElement('text'); resetToDefaults();");
  assert.equal(run("elements.length"), run("defaultsHome.length"));
  run("switchScreen('detail')");
  assert.equal(run("elements.length"), run("defaultsDetail.length"));
});

test("screen switching preserves edits and nested element IDs stay unique", () => {
  const run = editor();
  run("resetToDefaults(); addElement('card'); addElement('row');");
  const home = run("JSON.stringify(getConfig())");
  run("switchScreen('detail'); addElement('button'); switchScreen('home');");
  assert.equal(run("JSON.stringify(getConfig())"), home);
  const ids = run(`JSON.stringify((function collect(items) {
    return items.flatMap(item => [item.id, ...collect(item.children || [])]);
  })(elements))`);
  const values = JSON.parse(ids);
  assert.equal(new Set(values).size, values.length);
});

test("Deploy writes Unicode JSON to the sample repository with its current SHA", async () => {
  const run = editor();
  const requests = JSON.parse(
    await run(`(async () => {
    resetToDefaults();
    elements[0].text = '한글 샘플';
    document.getElementById('ghToken').value = 'test-token';
    setDeploy = () => {};
    pollActionStatus = () => {};
    const requests = [];
    fetch = async (url, options) => {
      requests.push({url, ...options});
      return {ok:true, json:async () => ({sha:'existing-sha'})};
    };
    await deployConfig();
    return JSON.stringify(requests);
  })()`),
  );
  assert.equal(requests.length, 2);
  assert.equal(
    requests[1].url,
    "https://api.github.com/repos/kangmin1012/RemoteCompose_Sample_Web/contents/config.json",
  );
  assert.equal(requests[1].method, "PUT");
  const body = JSON.parse(requests[1].body);
  assert.equal(body.sha, "existing-sha");
  const config = JSON.parse(
    Buffer.from(body.content, "base64").toString("utf8"),
  );
  assert.equal(config.elements[0].text, "한글 샘플");
});
