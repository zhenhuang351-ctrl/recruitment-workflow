import assert from "node:assert/strict";
import test from "node:test";
import { injectAutoLedgerData, prepareReviewRows, rowsFromLedgerValues } from "../scripts/sync-dashboard-data.mjs";

test("rowsFromLedgerValues reads the ledger header row and ignores empty records", () => {
  const rows = rowsFromLedgerValues([
    ["岗位", "姓名", "A.主阶段"],
    ["岗位甲", "A", "2-业务一面"],
    ["", "", ""],
  ], "岗位甲");

  assert.deepEqual(rows, [{
    "岗位": "岗位甲",
    "姓名": "A",
    "A.主阶段": "2-业务一面",
    __sheetName: "岗位甲",
    jobNameFromSheet: "岗位甲",
  }]);
});

test("rowsFromLedgerValues writes the recruiting role separately from the candidate's current role", () => {
  const [row] = rowsFromLedgerValues([
    ["当前岗位", "姓名"],
    ["当前产品岗位", "A"],
  ], "岗位甲");

  assert.equal(row["当前岗位"], "当前产品岗位");
  assert.equal(row["岗位"], "岗位甲");
});

test("injectAutoLedgerData adds a replaceable data block and preserves upload support", () => {
  const source = `let rawData = [];\nfunction getStageNameByCode() {}\ndocument.getElementById('timeDimension').addEventListener('change', function() {});`;
  const result = injectAutoLedgerData(source, [{ "姓名": "A" }]);

  assert.match(result, /AUTO_LEDGER_DATA:START/);
  assert.match(result, /const AUTO_DASHBOARD_DATA = \[{"姓名":"A"}\]/);
  assert.match(result, /function loadAutoLedgerData\(\)/);
  assert.match(result, /getStageNameByCode/);
  assert.match(result, /timeDimension/);
});

test("injectAutoLedgerData replaces old data rather than appending another block", () => {
  const source = `let rawData = [];\nfunction getStageNameByCode() {}\ndocument.getElementById('timeDimension').addEventListener('change', function() {});`;
  const once = injectAutoLedgerData(source, [{ "姓名": "B" }]);
  const twice = injectAutoLedgerData(once, [{ "姓名": "A" }]);

  assert.equal((twice.match(/AUTO_LEDGER_DATA:START/g) || []).length, 1);
  assert.match(twice, /"姓名":"A"/);
  assert.doesNotMatch(twice, /"姓名":"B"/);
});

test("prepareReviewRows counts a terminated candidate with a decision date at the decision stage", () => {
  const [row] = prepareReviewRows([{
    "姓名": "A",
    "主阶段": "终止",
    "阶段状态": "已终止",
    "决策会日期": 46227,
    "终止原因": "其他待说明",
  }]);

  assert.equal(row["主阶段"], "6-决策会");
  assert.equal(row["阶段状态"], "已终止");
});

test("prepareReviewRows counts a resume mismatch termination at resume review", () => {
  const [row] = prepareReviewRows([{
    "姓名": "B",
    "主阶段": "终止",
    "阶段状态": "已终止",
    "终止原因": "简历不匹配",
  }]);

  assert.equal(row["主阶段"], "0-简历待评估");
});
