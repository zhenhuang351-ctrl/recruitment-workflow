import assert from "node:assert/strict";
import test from "node:test";
import { ledgerColumns, stageValues, statusValues, terminationReasons, buildLedger } from "../scripts/create-role-ledger.mjs";

test("ledger distinguishes age and all three experience definitions", () => {
  assert.deepEqual(ledgerColumns.slice(0, 7), [
    "候选人ID", "姓名", "年龄", "学历", "总工作年限", "对口岗位年限", "对口项目年限",
  ]);
  assert.ok(ledgerColumns.includes("年龄/年限资格提示"));
  assert.ok(stageValues.includes("1-电话沟通"));
  assert.equal(stageValues.includes("暂缓"), false);
  assert.equal(stageValues.includes("终止"), false);
  assert.ok(statusValues.includes("已约面"));
  assert.ok(statusValues.includes("暂缓"));
  assert.ok(statusValues.includes("终止"));
  assert.ok(terminationReasons.includes("Base 不符"));
});

test("ledger builder creates four role-specific sheets and avoids automatic rejection", async () => {
  const workbook = await buildLedger("示例岗位");
  const sheets = await workbook.inspect({ kind: "sheet", include: "name" });
  assert.match(sheets.ndjson, /候选人台账/);
  assert.match(sheets.ndjson, /状态字典/);
  assert.match(sheets.ndjson, /复盘口径/);
  assert.match(sheets.ndjson, /选项配置/);
});
