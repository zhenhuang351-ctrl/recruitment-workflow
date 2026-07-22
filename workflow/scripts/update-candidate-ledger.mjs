import fs from "node:fs/promises";
import ExcelJS from "exceljs";
import { ledgerColumns } from "./create-role-ledger.mjs";
const indexes = new Map(ledgerColumns.map((name, index) => [name, index + 1]));
export function decisionToLedgerPatch({ candidateId, name, decision, stage = "0-简历待评估", reason = "", note = "" }) {
  const base = { 候选人ID: candidateId, 姓名: name, 状态更新时间: new Date(), 更新人: "招聘者", 最后更新时间: new Date() };
  if (decision === "terminate") return { ...base, 主阶段: stage, 阶段状态: "终止", 终止原因: reason || "其他待说明", 下一步动作: "", 备注: `招聘者确认终止：${note || reason || "待补充"}` };
  if (decision === "defer") return { ...base, 主阶段: stage, 阶段状态: "暂缓", 终止原因: "", 下一步动作: "等待招聘者确认恢复跟进时间", 备注: `招聘者确认暂缓：${note || "待补充"}` };
  if (decision === "ready_for_interview") return { ...base, 主阶段: stage, 阶段状态: "待候选人回复", 终止原因: "", 下一步动作: "与候选人确认面试时间", 备注: `招聘者确认符合条件，可约面${note ? `：${note}` : ""}` };
  throw new Error(`Unsupported decision: ${decision}`);
}
export function mergeCandidate(candidate) { const patch = { ...decisionToLedgerPatch(candidate), ...candidate.fields }; for (const key of ["简历收取时间", "下次跟进日期", "一面日期", "二面日期", "三面日期", "HRBP日期", "决策会日期"]) if (typeof patch[key] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(patch[key])) patch[key] = new Date(`${patch[key]}T00:00:00`); return patch; }
export async function upsertCandidates({ ledgerPath, candidates }) {
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.readFile(ledgerPath); const sheet = workbook.getWorksheet("候选人台账");
  for (const candidate of candidates) { const patch = mergeCandidate(candidate); let row = null; sheet.eachRow((current, rowNumber) => { if (rowNumber >= 4 && current.getCell(indexes.get("候选人ID")).value === candidate.candidateId) row = current; }); if (!row) { for (let n = 4; n <= 303; n += 1) { const current = sheet.getRow(n); if (!current.getCell(indexes.get("候选人ID")).value) { row = current; break; } } } if (!row) throw new Error("Candidate ledger has no empty rows available."); Object.entries(patch).forEach(([key, value]) => row.getCell(indexes.get(key)).value = value ?? ""); }
  await workbook.xlsx.writeFile(ledgerPath);
}
if (process.argv[1]?.endsWith("update-candidate-ledger.mjs")) { const argv = (name) => process.argv[process.argv.indexOf(name) + 1]; const ledgerPath = argv("--ledger"); const input = argv("--input"); if (!ledgerPath || !input) throw new Error("Usage: --ledger <candidate-ledger.xlsx> --input <candidates.json>"); await upsertCandidates({ ledgerPath, candidates: JSON.parse(await fs.readFile(input, "utf8")) }); }
