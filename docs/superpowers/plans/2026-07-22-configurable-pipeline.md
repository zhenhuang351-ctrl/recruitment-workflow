# Configurable Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow each role to define its own ordered recruiting stages once, then use that configuration for the ledger dropdowns and HTML funnel.

**Architecture:** A role-local `PIPELINE.json` is the human-readable source of truth for ordered main stages and stage statuses. Ledger creation writes its values into the workbook configuration sheet; dashboard generation reads the same sheet and renders funnel stages in that exact order. Interactive role clarification creates the configuration before any candidate work starts.

**Tech Stack:** Node.js ESM, JSON, `@oai/artifact-tool`, Markdown templates, Node test runner.

---

### Task 0: Replace the private spreadsheet runtime and remove stale repository messaging

**Files:**
- Modify: `package.json`
- Create: `package-lock.json`
- Modify: `workflow/scripts/create-role-ledger.mjs`
- Modify: `workflow/scripts/update-candidate-ledger.mjs`
- Modify: `workflow/scripts/create-dashboard.mjs`
- Modify: `workflow/scripts/sync-dashboard-data.mjs`
- Modify: `workflow/scripts/format-ledger-grid.mjs`
- Modify: `workflow/scripts/verify-ledger.mjs`
- Modify: `README.md`
- Modify: `docs/DESIGN.md`

- [ ] **Step 1: Replace `@oai/artifact-tool` with public `exceljs`**

Add `exceljs` to `package.json` dependencies and install it with npm. Rewrite spreadsheet imports and workbook load/save helpers so every script runs after `npm install`, without a Codex runtime path.

- [ ] **Step 2: Preserve current ledger behavior**

Keep the four worksheet names, centered grid formatting, main-stage/status dropdowns, termination reason dropdown, filters, frozen headers, and HTML data extraction. Use `exceljs` data validations and styles where supported.

- [ ] **Step 3: Remove obsolete messaging**

Remove all mentions of `Viy1204`, `recruiting-copilot`, private Codex spreadsheet dependencies, demo pages, and fixed role examples from current README and design documents. Keep only the project’s own goals, boundaries, workflow and installation instructions.

- [ ] **Step 4: Verify public portability**

Run `npm install` and `npm test` in the isolated worktree. Run `rg -n "Viy1204|recruiting-copilot|@oai/artifact-tool|虚构|示例岗位" README.md docs workflow package.json` and require no matches in current public documentation or runtime code.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json README.md docs/DESIGN.md workflow
git commit -m "Use public spreadsheet runtime"
```

---

### Task 1: Add a validated pipeline configuration module

**Files:**
- Create: `workflow/scripts/pipeline-config.mjs`
- Create: `workflow/tests/pipeline-config.test.mjs`

- [ ] **Step 1: Write the failing tests**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { normalizePipeline, stageLabels } from "../scripts/pipeline-config.mjs";

test("pipeline preserves recruiter-confirmed stage order", () => {
  const pipeline = normalizePipeline({
    stages: [{ id: 0, name: "筛选" }, { id: 1, name: "业务沟通" }, { id: 2, name: "录用" }],
    statuses: ["待处理", "终止"],
  });
  assert.deepEqual(stageLabels(pipeline), ["0-筛选", "1-业务沟通", "2-录用"]);
});

test("pipeline rejects duplicate ids and empty names", () => {
  assert.throws(() => normalizePipeline({ stages: [{ id: 0, name: "" }], statuses: ["待处理"] }));
  assert.throws(() => normalizePipeline({ stages: [{ id: 0, name: "筛选" }, { id: 0, name: "面试" }], statuses: ["待处理"] }));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test workflow/tests/pipeline-config.test.mjs`

Expected: FAIL because `pipeline-config.mjs` does not exist.

- [ ] **Step 3: Implement validation and file loading**

```js
export const defaultStatuses = ["待处理", "待招聘者确认", "待候选人回复", "已约面", "进行中", "已完成", "暂缓", "终止"];

export function normalizePipeline(input) {
  if (!Array.isArray(input?.stages) || input.stages.length === 0) throw new Error("流程配置至少需要一个主阶段。");
  const stages = [...input.stages]
    .map(({ id, name }) => ({ id: Number(id), name: String(name ?? "").trim() }))
    .sort((a, b) => a.id - b.id);
  if (stages.some((stage) => !Number.isInteger(stage.id) || !stage.name)) throw new Error("每个阶段必须有整数 id 和非空名称。");
  if (new Set(stages.map((stage) => stage.id)).size !== stages.length) throw new Error("流程阶段 id 不能重复。");
  const statuses = [...new Set((input.statuses ?? defaultStatuses).map((item) => String(item).trim()).filter(Boolean))];
  if (!statuses.includes("暂缓") || !statuses.includes("终止")) throw new Error("阶段状态必须包含暂缓和终止。");
  return { stages, statuses };
}

export function stageLabels(pipeline) {
  return pipeline.stages.map(({ id, name }) => `${id}-${name}`);
}
```

Also export `readPipeline(path)` using `fs.readFile` and `JSON.parse`, returning `normalizePipeline`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test workflow/tests/pipeline-config.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add workflow/scripts/pipeline-config.mjs workflow/tests/pipeline-config.test.mjs
git commit -m "Add role pipeline configuration"
```

### Task 2: Drive ledger dropdowns from the role pipeline

**Files:**
- Modify: `workflow/scripts/create-role-ledger.mjs`
- Modify: `workflow/scripts/update-candidate-ledger.mjs`
- Modify: `workflow/tests/ledger-schema.test.mjs`

- [ ] **Step 1: Write the failing custom-stage ledger test**

```js
test("ledger uses custom main stages while keeping pause and termination as statuses", async () => {
  const pipeline = { stages: [{ id: 0, name: "资料筛选" }, { id: 1, name: "业务沟通" }], statuses: ["待处理", "已完成", "暂缓", "终止"] };
  const workbook = await buildLedger("目标岗位", pipeline);
  const config = workbook.worksheets.getItem("选项配置");
  assert.deepEqual(config.getRange("B2:B3").values, [["0-资料筛选"], ["1-业务沟通"]]);
  assert.deepEqual(config.getRange("C2:C5").values, [["待处理"], ["已完成"], ["暂缓"], ["终止"]]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test workflow/tests/ledger-schema.test.mjs`

Expected: FAIL because `buildLedger` does not accept a pipeline.

- [ ] **Step 3: Implement pipeline-aware ledger generation**

Change `buildLedger(roleName, pipeline)` and `writeLedger({ roleName, outputPath, pipeline })` to use `stageLabels(pipeline)` and `pipeline.statuses` instead of module-level hard-coded arrays. Keep the default exported stage/status values only as a fallback pipeline for direct module use. Add a `--pipeline <path>` CLI argument; the command must fail with a clear error when it is missing.

Change `upsertCandidates` to read the active stage/status labels from the workbook `选项配置` sheet before rebuilding validations, so updates do not overwrite custom role settings.

- [ ] **Step 4: Run focused tests**

Run: `node --test workflow/tests/ledger-schema.test.mjs workflow/tests/candidate-ledger-update.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add workflow/scripts/create-role-ledger.mjs workflow/scripts/update-candidate-ledger.mjs workflow/tests/ledger-schema.test.mjs
git commit -m "Use role pipeline in candidate ledger"
```

### Task 3: Render the funnel in configured order

**Files:**
- Modify: `workflow/scripts/create-dashboard.mjs`
- Modify: `workflow/scripts/sync-dashboard-data.mjs`
- Modify: `workflow/tests/dashboard.test.mjs`
- Modify: `workflow/tests/auto-dashboard.test.mjs`

- [ ] **Step 1: Write the failing dashboard-order test**

```js
test("dashboard preserves custom pipeline order including zero-count stages", async () => {
  const pipeline = { stages: [{ id: 0, name: "筛选" }, { id: 1, name: "业务沟通" }, { id: 2, name: "入职" }], statuses: ["待处理", "终止"] };
  const workbook = await buildLedger("目标岗位", pipeline);
  const ledger = workbook.worksheets.getItem("候选人台账");
  ledger.getRange("T4").values = [["1-业务沟通"]];
  const data = await summarizeLedgerWorkbook(workbook, "目标岗位");
  assert.deepEqual(data.stages, [
    { label: "0-筛选", count: 0 },
    { label: "1-业务沟通", count: 1 },
    { label: "2-入职", count: 0 },
  ]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test workflow/tests/dashboard.test.mjs`

Expected: FAIL because dashboard summary still uses the global default stages.

- [ ] **Step 3: Implement workbook-driven stage ordering**

In `create-dashboard.mjs`, read non-empty stage labels from `选项配置!B2:B...`, and pass those labels to `withZeroCounts`. `summarizeLedgerWorkbook` must never infer an order from candidate rows.

In `sync-dashboard-data.mjs`, read the same configuration range and inject an `AUTO_DASHBOARD_STAGE_ORDER` constant alongside `AUTO_DASHBOARD_DATA`. Make the generated loader expose that ordering to compatible role-local `index.html` pages; keep existing upload support unchanged.

- [ ] **Step 4: Run focused tests**

Run: `node --test workflow/tests/dashboard.test.mjs workflow/tests/auto-dashboard.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add workflow/scripts/create-dashboard.mjs workflow/scripts/sync-dashboard-data.mjs workflow/tests/dashboard.test.mjs workflow/tests/auto-dashboard.test.mjs
git commit -m "Render funnel in configured stage order"
```

### Task 4: Add the interactive clarification and role-file templates

**Files:**
- Create: `workflow/templates/PIPELINE.json`
- Modify: `workflow/templates/岗位澄清提示词.md`
- Modify: `workflow/templates/ROLE_STANDARD.md`
- Modify: `workflow/AGENTS.md`
- Modify: `workflow/README.md`
- Modify: `workflow/tests/templates.test.mjs`
- Modify: `workflow/tests/router.test.mjs`

- [ ] **Step 1: Write failing template and router assertions**

```js
test("role clarification asks for ordered stage names before candidate work", async () => {
  const text = await readFile("workflow/templates/岗位澄清提示词.md", "utf8");
  assert.match(text, /按实际顺序列出/);
  assert.match(text, /PIPELINE\.json/);
});

test("router requires a pipeline before candidate work", async () => {
  const content = await readFile("workflow/AGENTS.md", "utf8");
  assert.match(content, /PIPELINE\.json/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test workflow/tests/templates.test.mjs workflow/tests/router.test.mjs`

Expected: FAIL because the workflow does not yet require pipeline confirmation.

- [ ] **Step 3: Implement the role-facing workflow**

Create the `PIPELINE.json` template with an empty `stages` array and the default stage statuses. Update role clarification to ask one dedicated question for ordered stage names after the role scope is clear. Require human confirmation before creating or changing the file.

Add a `招聘流程配置` section to `ROLE_STANDARD.md` that links the file, records the configuration version and confirmation date. Update `AGENTS.md` so candidate work reads `PIPELINE.json` in addition to the role standard and ledger. Update `workflow/README.md` with exact commands:

```powershell
node workflow/scripts/create-role-ledger.mjs --role "岗位名称" --pipeline "岗位/岗位名称/PIPELINE.json" --out "岗位/岗位名称/candidate-ledger.xlsx"
node workflow/scripts/create-dashboard.mjs --role "岗位名称" --ledger "岗位/岗位名称/candidate-ledger.xlsx" --out "岗位/岗位名称/index.html"
```

- [ ] **Step 4: Run focused tests**

Run: `node --test workflow/tests/templates.test.mjs workflow/tests/router.test.mjs`

Expected: PASS.

- [ ] **Step 5: Run the full suite and commit**

Run: `node --test workflow/tests/*.test.mjs`

Expected: PASS.

```bash
git add workflow/templates workflow/AGENTS.md workflow/README.md workflow/tests/templates.test.mjs workflow/tests/router.test.mjs
git commit -m "Require confirmed role pipeline"
```

### Task 5: Verify generated files and update public documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/DESIGN.md`
- Test: `workflow/tests/pipeline-config.test.mjs`

- [ ] **Step 1: Add a documentation assertion**

```js
test("pipeline documentation keeps pause and termination in stage status", async () => {
  const text = await readFile("workflow/00-招聘规则.md", "utf8");
  assert.match(text, /阶段状态.*暂缓.*终止/);
  assert.doesNotMatch(text, /主阶段统一使用.*暂缓/);
});
```

- [ ] **Step 2: Update documentation**

Document that `PIPELINE.json` is required for each role, establishes the funnel order, and keeps pause/termination as stage statuses. Remove any sentence implying a fixed interview sequence.

- [ ] **Step 3: Run final verification and commit**

Run: `node --test workflow/tests/*.test.mjs`

Expected: PASS.

```bash
git add README.md docs/DESIGN.md workflow/tests/pipeline-config.test.mjs
git commit -m "Document configurable recruitment pipeline"
git push
```
