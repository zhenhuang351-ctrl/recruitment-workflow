import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ExcelJS from "exceljs";
import { ledgerColumns } from "./create-role-ledger.mjs";
const indexes = new Map(ledgerColumns.map((name, index) => [name, index + 1]));
export function decisionToLedgerPatch({ candidateId, name, decision, stage, reason = "", note = "" }) {
  if (!stage) throw new Error("候选人流程更新必须提供 PIPELINE.json 中已确认的主阶段。");
  const base = { 候选人ID: candidateId, 姓名: name, 状态更新时间: new Date(), 更新人: "招聘者", 最后更新时间: new Date() };
  if (decision === "terminate") return { ...base, 主阶段: stage, 阶段状态: "终止", 终止原因: reason || "其他待说明", 下一步动作: "", 备注: `招聘者确认终止：${note || reason || "待补充"}` };
  if (decision === "defer") return { ...base, 主阶段: stage, 阶段状态: "进行中", 终止原因: "", 下一步动作: "等待招聘者确认恢复跟进时间", 备注: `招聘者确认暂缓：${note || "待补充"}` };
  if (decision === "ready_for_interview") return { ...base, 主阶段: stage, 阶段状态: "进行中", 终止原因: "", 下一步动作: "与候选人确认面试时间", 备注: `招聘者确认符合条件，可约面${note ? `：${note}` : ""}` };
  throw new Error(`Unsupported decision: ${decision}`);
}
export function mergeCandidate(candidate) { const patch = { ...decisionToLedgerPatch(candidate), ...candidate.fields }; for (const key of ["简历收取时间", "下次跟进日期", "一面日期", "二面日期", "三面日期", "HRBP日期", "决策会日期"]) if (typeof patch[key] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(patch[key])) patch[key] = new Date(`${patch[key]}T00:00:00`); return patch; }
export async function upsertCandidates({ ledgerPath, candidates }) {
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.readFile(ledgerPath); const sheet = workbook.getWorksheet("候选人台账");
  for (const candidate of candidates) { const patch = mergeCandidate(candidate); let row = null; sheet.eachRow((current, rowNumber) => { if (rowNumber >= 4 && current.getCell(indexes.get("候选人ID")).value === candidate.candidateId) row = current; }); if (!row) { for (let n = 4; n <= sheet.rowCount; n += 1) { const current = sheet.getRow(n); if (!current.getCell(indexes.get("候选人ID")).value) { row = current; break; } } } if (!row) throw new Error("Candidate ledger has no empty rows available. 请重新创建更大容量的台账。"); Object.entries(patch).forEach(([key, value]) => row.getCell(indexes.get(key)).value = value ?? ""); }
  await workbook.xlsx.writeFile(ledgerPath);
}
function argument(name) { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; }
const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(currentFile).href) { const ledgerPath = argument("--ledger"); const input = argument("--input"); if (!ledgerPath || !input) throw new Error("用法：--ledger <candidate-ledger.xlsx> --input <candidates.json>"); let candidates; try { candidates = JSON.parse(await fs.readFile(input, "utf8")); } catch (error) { throw new Error(`候选人更新文件无法读取或解析：${input}。${error.message}`); } await upsertCandidates({ ledgerPath, candidates }); }
