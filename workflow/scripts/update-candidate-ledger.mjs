import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";
import { ledgerColumns, stageValues, statusValues } from "./create-role-ledger.mjs";

const columnIndexes = new Map(ledgerColumns.map((column, index) => [column, index]));

export function decisionToLedgerPatch({ candidateId, name, decision, stage = "0-简历待评估", reason = "", note = "" }) {
  const base = {
    候选人ID: candidateId,
    姓名: name,
    状态更新时间: new Date(),
    更新人: "招聘者",
    最后更新时间: new Date(),
  };
  if (decision === "terminate") {
    return {
      ...base,
      主阶段: stage,
      阶段状态: "终止",
      终止原因: reason || "其他待说明",
      下一步动作: "",
      备注: `招聘者确认终止：${note || reason || "待补充"}`,
    };
  }
  if (decision === "defer") {
    return {
      ...base,
      主阶段: stage,
      阶段状态: "暂缓",
      终止原因: "",
      下一步动作: "等待招聘者确认恢复跟进时间",
      备注: `招聘者确认暂缓：${note || "待补充"}`,
    };
  }
  if (decision === "ready_for_interview") {
    return {
      ...base,
      主阶段: "2-业务一面",
      阶段状态: "待候选人回复",
      终止原因: "",
      下一步动作: "与候选人确认一面时间",
      备注: `招聘者确认符合条件，可约面${note ? `：${note}` : ""}`,
    };
  }
  throw new Error(`Unsupported decision: ${decision}`);
}

export function mergeCandidate(candidate) {
  const patch = {
    ...decisionToLedgerPatch(candidate),
    ...candidate.fields,
  };
  for (const column of ["简历收取时间", "下次跟进日期", "一面日期", "二面日期", "三面日期", "HRBP日期", "决策会日期"]) {
    if (typeof patch[column] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(patch[column])) {
      patch[column] = new Date(`${patch[column]}T00:00:00`);
    }
  }
  return patch;
}

export async function upsertCandidates({ ledgerPath, candidates }) {
  const input = await FileBlob.load(ledgerPath);
  const workbook = await SpreadsheetFile.importXlsx(input);
  const sheet = workbook.worksheets.getItem("候选人台账");
  const config = workbook.worksheets.getItem("选项配置");
  config.getRange("B2:B12").clear({ applyTo: "contents" });
  config.getRangeByIndexes(1, 1, stageValues.length, 1).values = stageValues.map((value) => [value]);
  config.getRangeByIndexes(1, 2, statusValues.length, 1).values = statusValues.map((value) => [value]);
  sheet.getRange("T4:T303").dataValidation = { rule: { type: "list", formula1: `='选项配置'!$B$2:$B$${stageValues.length + 1}` } };
  sheet.getRange("U4:U303").dataValidation = { rule: { type: "list", formula1: `='选项配置'!$C$2:$C$${statusValues.length + 1}` } };
  const range = sheet.getRange("A4:AS303");
  const rows = range.values;

  for (const candidate of candidates) {
    const patch = mergeCandidate(candidate);
    let rowIndex = rows.findIndex((row) => row[columnIndexes.get("候选人ID")] === candidate.candidateId);
    if (rowIndex < 0) rowIndex = rows.findIndex((row) => !row[columnIndexes.get("候选人ID")]);
    if (rowIndex < 0) throw new Error("Candidate ledger has no empty rows available.");
    for (const [column, value] of Object.entries(patch)) {
      const columnIndex = columnIndexes.get(column);
      if (columnIndex !== undefined) rows[rowIndex][columnIndex] = value ?? "";
    }
  }

  range.values = rows;
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(ledgerPath);
}

function getArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

if (process.argv[1]?.endsWith("update-candidate-ledger.mjs")) {
  const ledgerPath = getArgument("--ledger");
  const inputPath = getArgument("--input");
  if (!ledgerPath || !inputPath) throw new Error("Usage: --ledger <candidate-ledger.xlsx> --input <candidates.json>");
  const candidates = JSON.parse(await fs.readFile(inputPath, "utf8"));
  await upsertCandidates({ ledgerPath, candidates });
  console.log(`已更新 ${candidates.length} 位候选人。`);
}
