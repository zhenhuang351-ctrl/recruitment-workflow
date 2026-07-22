import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ExcelJS from "exceljs";
import { readPipeline } from "./pipeline-config.mjs";

export const ledgerColumns = [
  "候选人ID", "姓名", "年龄", "学历", "总工作年限", "对口岗位年限", "对口项目年限", "当前公司", "当前岗位", "当前Base", "目标Base", "简历收取时间", "简历来源", "推荐人/渠道", "简历/档案链接", "年龄/年限资格提示", "能力证据得分", "证据覆盖率", "核心证据缺口", "主阶段", "阶段状态", "状态更新时间", "下一步动作", "下次跟进日期", "责任人", "是否看机会", "求职动机", "当前薪资", "期望薪资", "期望职级", "Offer情况", "可入职时间", "电话纪要", "一面日期", "二面日期", "三面日期", "HRBP日期", "决策会日期", "面试反馈摘要", "业务判断", "终止原因", "备注", "策略反馈标签", "更新人", "最后更新时间",
];
export const stageValues = ["0-简历待评估", "1-电话沟通", "2-业务一面", "3-业务二面", "4-终面/交叉面", "5-HRBP", "6-决策会", "Offer", "入职"];
export const statusValues = ["待处理", "待招聘者确认", "待候选人回复", "已约面", "进行中", "已完成", "暂缓", "终止"];
export const terminationReasons = ["不看机会/无意向", "Base 不符", "联系不上", "薪资不符", "简历不匹配", "面试/评审不通过", "横向比较", "候选人自行退出", "岗位暂停", "其他待说明"];
const sourceValues = ["内部人才库", "员工推荐", "招聘平台", "猎头", "官网投递", "活动/社群", "其他"];
const statuses = statusValues;
const border = { style: "thin", color: { argb: "FFD6DEE6" } };
const headerFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF143D59" } };

function setHeader(row) { row.eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = headerFill; cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; cell.border = { top: border, left: border, bottom: border, right: border }; }); }
function listFormula(column, count) { return `'选项配置'!$${column}$2:$${column}$${count + 1}`; }

export async function buildLedger(roleName, pipeline = { stages: stageValues.map((label, id) => ({ id, name: label.replace(/^\d+-/, "") })), statuses }) {
  const workbook = new ExcelJS.Workbook();
  const stages = pipeline.stages ? pipeline.stages.map(({ id, name }) => `${id}-${name}`) : stageValues;
  const activeStatuses = pipeline.statuses ?? statuses;
  const ledger = workbook.addWorksheet("候选人台账", { views: [{ showGridLines: false, state: "frozen", ySplit: 3, xSplit: 2 }] });
  const dictionary = workbook.addWorksheet("状态字典", { views: [{ showGridLines: false }] });
  const review = workbook.addWorksheet("复盘口径", { views: [{ showGridLines: false, state: "frozen", ySplit: 3 }] });
  const config = workbook.addWorksheet("选项配置", { views: [{ showGridLines: false }] });
  ledger.mergeCells("A1:AS1"); ledger.getCell("A1").value = `${roleName}｜候选人台账`; ledger.getCell("A1").font = { bold: true, color: { argb: "FFFFFFFF" }, size: 16 }; ledger.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B2239" } };
  ledger.mergeCells("A2:AS2"); ledger.getCell("A2").value = "使用说明：主阶段记录实际停留节点；阶段状态使用暂缓或终止标记流程结果。所有流程变更需招聘者人工确认。"; ledger.getCell("A2").alignment = { wrapText: true, vertical: "middle" };
  ledger.addRow(ledgerColumns); setHeader(ledger.getRow(3)); ledger.autoFilter = "A3:AS3";
  ledger.columns.forEach((column, index) => { column.width = index === 32 || index === 38 || index === 41 ? 28 : 14; });
  for (let row = 4; row <= 303; row += 1) { const r = ledger.getRow(row); r.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; r.eachCell({ includeEmpty: true }, (cell) => { cell.border = { top: border, left: border, bottom: border, right: border }; }); }
  ["L", "V", "X", "AH", "AI", "AJ", "AK", "AL", "AS"].forEach((col) => { ledger.getColumn(col).numFmt = "yyyy-mm-dd"; });
  const configColumns = [["简历来源", sourceValues], ["主阶段", stages], ["阶段状态", activeStatuses], ["终止原因", terminationReasons]];
  configColumns.forEach(([title, values], index) => { const col = index + 1; config.getCell(1, col).value = title; values.forEach((value, row) => { config.getCell(row + 2, col).value = value; }); config.getColumn(col).width = 20; }); setHeader(config.getRow(1));
  ledger.getColumn("T").eachCell({ includeEmpty: true }, (cell, row) => { if (row >= 4) cell.dataValidation = { type: "list", allowBlank: true, formulae: [listFormula("B", stages.length)] }; });
  ledger.getColumn("U").eachCell({ includeEmpty: true }, (cell, row) => { if (row >= 4) cell.dataValidation = { type: "list", allowBlank: true, formulae: [listFormula("C", activeStatuses.length)] }; });
  ledger.getColumn("M").eachCell({ includeEmpty: true }, (cell, row) => { if (row >= 4) cell.dataValidation = { type: "list", allowBlank: true, formulae: [listFormula("A", sourceValues.length)] }; });
  ledger.getColumn("AO").eachCell({ includeEmpty: true }, (cell, row) => { if (row >= 4) cell.dataValidation = { type: "list", allowBlank: true, formulae: [listFormula("D", terminationReasons.length)] }; });
  dictionary.addRow(["类别", "值", "使用说明"]); setHeader(dictionary.getRow(1)); [...stages.map((v) => ["主阶段", v, "流程节点"]), ...activeStatuses.map((v) => ["阶段状态", v, "跟进状态"]), ...terminationReasons.map((v) => ["终止原因", v, "阶段状态为终止时填写"])].forEach((row) => dictionary.addRow(row));
  review.mergeCells("A1:K1"); review.getCell("A1").value = `${roleName}｜招聘复盘（脱敏聚合）`; review.addRow([]); review.addRow(["主阶段", "候选人数量", "口径"]); setHeader(review.getRow(3)); stages.forEach((stage, index) => { const row = review.addRow([stage, { formula: `COUNTIF('候选人台账'!$T$4:$T$303,A${index + 4})` }, "按当前主阶段统计"]); row.eachCell((cell) => { cell.border = { top: border, left: border, bottom: border, right: border }; }); });
  return workbook;
}

export async function writeLedger({ roleName, outputPath, pipeline }) { const workbook = await buildLedger(roleName, pipeline); await fs.mkdir(path.dirname(outputPath), { recursive: true }); await workbook.xlsx.writeFile(outputPath); return outputPath; }
function argument(name) { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; }
const current = fileURLToPath(import.meta.url);
if (process.argv[1] && pathToFileURL(process.argv[1]).href === pathToFileURL(current).href) { const roleName = argument("--role"); const outputPath = argument("--out"); const pipelinePath = argument("--pipeline"); if (!roleName || !outputPath || !pipelinePath) throw new Error("用法：--role <岗位名称> --pipeline <PIPELINE.json> --out <candidate-ledger.xlsx>"); await writeLedger({ roleName, outputPath, pipeline: await readPipeline(pipelinePath) }); console.log(`已生成：${outputPath}`); }
