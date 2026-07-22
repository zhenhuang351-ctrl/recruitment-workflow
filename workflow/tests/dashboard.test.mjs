import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboard, summarizeLedgerWorkbook } from "../scripts/create-dashboard.mjs";
import { buildLedger } from "../scripts/create-role-ledger.mjs";

test("dashboard exposes aggregate pipeline data without candidate-level details", () => {
  const html = buildDashboard({
    role: "示例岗位",
    stages: [{ label: "1-电话沟通", count: 3 }],
    sources: [{ label: "员工推荐", count: 2 }],
    terminationReasons: [{ label: "Base 不符", count: 1 }],
  });
  assert.match(html, /1-电话沟通/);
  assert.match(html, /员工推荐/);
  assert.doesNotMatch(html, /候选人姓名/);
  assert.doesNotMatch(html, /年龄/);
  assert.doesNotMatch(html, /薪资/);
});

test("dashboard summary reads stages sources and termination reasons from the role ledger", async () => {
  const workbook = await buildLedger("目标岗位");
  const ledger = workbook.getWorksheet("候选人台账");
  ledger.getCell("M4").value = "员工推荐";
  ledger.getCell("T4").value = "1-电话沟通";
  ledger.getCell("AO5").value = "Base 不符";

  const data = await summarizeLedgerWorkbook(workbook, "目标岗位");
  assert.deepEqual(data.stages.find((item) => item.label === "1-电话沟通"), { label: "1-电话沟通", count: 1 });
  assert.deepEqual(data.stages.find((item) => item.label === "0-简历待评估"), { label: "0-简历待评估", count: 0 });
  assert.deepEqual(data.sources.find((item) => item.label === "员工推荐"), { label: "员工推荐", count: 1 });
  assert.deepEqual(data.terminationReasons.find((item) => item.label === "Base 不符"), { label: "Base 不符", count: 1 });
});
