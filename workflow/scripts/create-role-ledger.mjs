import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

export const ledgerColumns = [
  "候选人ID", "姓名", "年龄", "学历", "总工作年限", "对口岗位年限", "对口项目年限",
  "当前公司", "当前岗位", "当前Base", "目标Base", "简历收取时间", "简历来源", "推荐人/渠道", "简历/档案链接",
  "年龄/年限资格提示", "能力证据得分", "证据覆盖率", "核心证据缺口",
  "主阶段", "阶段状态", "状态更新时间", "下一步动作", "下次跟进日期", "责任人",
  "是否看机会", "求职动机", "当前薪资", "期望薪资", "期望职级", "Offer情况", "可入职时间", "电话纪要",
  "一面日期", "二面日期", "三面日期", "HRBP日期", "决策会日期", "面试反馈摘要", "业务判断",
  "终止原因", "备注", "策略反馈标签", "更新人", "最后更新时间",
];

export const stageValues = [
  "0-简历待评估", "1-电话沟通", "2-业务一面", "3-业务二面", "4-终面/交叉面",
  "5-HRBP", "6-决策会", "Offer", "入职",
];

export const terminationReasons = [
  "不看机会/无意向", "Base 不符", "联系不上", "薪资不符", "简历不匹配", "面试/评审不通过",
  "横向比较", "候选人自行退出", "岗位暂停", "其他待说明",
];

export const statusValues = ["待处理", "待招聘者确认", "待候选人回复", "已约面", "进行中", "已完成", "暂缓", "终止"];
const sourceValues = ["内部人才库", "员工推荐", "招聘平台", "猎头", "官网投递", "活动/社群", "其他"];
const baseValues = ["北京", "上海", "广州", "深圳", "杭州", "成都", "武汉", "远程", "待确认"];
const levelValues = ["专员/初级", "中级", "高级", "专家", "管理岗", "待确认"];
const ownerValues = ["待分配"];
const opportunityValues = ["是", "否", "待确认"];
const qualificationValues = ["匹配", "待核实", "待人工确认", "不适用"];

const headerFormat = {
  fill: "#143D59",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  wrapText: true,
  borders: { preset: "outside", style: "thin", color: "#B7C8D6" },
};

function styleHeader(range) {
  range.format = headerFormat;
  range.format.rowHeight = 34;
}

function writeConfig(sheet, values, columnIndex, title) {
  sheet.getCell(0, columnIndex).values = [[title]];
  sheet.getRangeByIndexes(1, columnIndex, values.length, 1).values = values.map((value) => [value]);
}

function addListValidation(sheet, range, formula1) {
  range.dataValidation = { rule: { type: "list", formula1 } };
}

export async function buildLedger(roleName) {
  const workbook = Workbook.create();
  const ledger = workbook.worksheets.add("候选人台账");
  const dictionary = workbook.worksheets.add("状态字典");
  const review = workbook.worksheets.add("复盘口径");
  const config = workbook.worksheets.add("选项配置");

  for (const sheet of [ledger, dictionary, review, config]) sheet.showGridLines = false;

  ledger.getRange("A1:AS1").merge();
  ledger.getRange("A1").values = [[`${roleName}｜候选人台账`]];
  ledger.getRange("A1").format = { fill: "#0B2239", font: { bold: true, color: "#FFFFFF", size: 16 }, verticalAlignment: "center" };
  ledger.getRange("A1").format.rowHeight = 30;
  ledger.getRange("A2:AS2").merge();
  ledger.getRange("A2").values = [["使用说明：一位候选人在本岗位仅保留一行；主阶段记录候选人实际停留的流程节点，阶段状态使用暂缓或终止标记流程结果。所有流程变更均需招聘者人工确认。"]];
  ledger.getRange("A2").format = { fill: "#EAF3F7", font: { color: "#29546D", italic: true }, wrapText: true, verticalAlignment: "center" };
  ledger.getRange("A2").format.rowHeight = 38;
  ledger.getRange("A3:AS3").values = [ledgerColumns];
  styleHeader(ledger.getRange("A3:AS3"));
  ledger.getRange("A3:AS303").format.borders = { preset: "all", style: "thin", color: "#D6DEE6" };
  ledger.getRange("A3:AS303").format.horizontalAlignment = "center";
  ledger.getRange("A3:AS303").format.verticalAlignment = "center";
  ledger.getRange("A4:AS303").format.wrapText = true;
  ledger.getRange("C4:C303").format.numberFormat = "0";
  ledger.getRange("E4:G303").format.numberFormat = "0.0";
  ledger.getRange("R4:R303").format.numberFormat = "0.0%";
  for (const col of ["L", "V", "X", "AH", "AH", "AI", "AJ", "AK", "AL", "AS"]) {
    ledger.getRange(`${col}4:${col}303`).format.numberFormat = "yyyy-mm-dd";
  }
  ledger.freezePanes.freezeRows(3);
  ledger.freezePanes.freezeColumns(2);
  const widths = [14, 12, 8, 12, 12, 14, 14, 16, 16, 12, 12, 14, 13, 15, 22, 18, 14, 14, 24, 16, 14, 14, 20, 14, 12, 12, 24, 14, 14, 14, 16, 14, 34, 14, 14, 14, 14, 14, 30, 20, 18, 28, 18, 14, 16];
  widths.forEach((width, index) => { ledger.getCell(2, index).format.columnWidth = width; });

  writeConfig(config, sourceValues, 0, "简历来源");
  writeConfig(config, stageValues, 1, "主阶段");
  writeConfig(config, statusValues, 2, "阶段状态");
  writeConfig(config, terminationReasons, 3, "终止原因");
  writeConfig(config, baseValues, 4, "Base");
  writeConfig(config, levelValues, 5, "职级");
  writeConfig(config, ownerValues, 6, "责任人");
  writeConfig(config, opportunityValues, 7, "是否看机会");
  writeConfig(config, qualificationValues, 8, "资格提示");
  styleHeader(config.getRange("A1:I1"));
  config.getRange("A1:I20").format.borders = { preset: "insideHorizontal", style: "thin", color: "#E6EDF2" };
  config.getRange("A:I").format.columnWidth = 16;
  config.freezePanes.freezeRows(1);

  addListValidation(ledger, ledger.getRange("J4:K303"), "='选项配置'!$E$2:$E$10");
  addListValidation(ledger, ledger.getRange("M4:M303"), "='选项配置'!$A$2:$A$8");
  addListValidation(ledger, ledger.getRange("P4:P303"), "='选项配置'!$I$2:$I$5");
  addListValidation(ledger, ledger.getRange("T4:T303"), `='选项配置'!$B$2:$B$${stageValues.length + 1}`);
  addListValidation(ledger, ledger.getRange("U4:U303"), `='选项配置'!$C$2:$C$${statusValues.length + 1}`);
  addListValidation(ledger, ledger.getRange("Y4:Y303"), "='选项配置'!$G$2:$G$2");
  addListValidation(ledger, ledger.getRange("Z4:Z303"), "='选项配置'!$H$2:$H$4");
  addListValidation(ledger, ledger.getRange("AD4:AD303"), "='选项配置'!$F$2:$F$7");
  addListValidation(ledger, ledger.getRange("AO4:AO303"), "='选项配置'!$D$2:$D$11");
  ledger.getRange("P4:P303").conditionalFormats.add("containsText", { text: "待人工确认", format: { fill: "#FFF3CD", font: { color: "#7A5600" } } });
  ledger.getRange("T4:T303").conditionalFormats.add("containsText", { text: "终止", format: { fill: "#FDE2E2", font: { color: "#A61B1B" } } });

  dictionary.getRange("A1:E1").values = [["类别", "值", "使用阶段", "使用说明", "是否需人工确认"]];
  styleHeader(dictionary.getRange("A1:E1"));
  const dictionaryRows = [
    ...stageValues.map((value) => ["主阶段", value, "全流程", "反映候选人当前所在流程", "是"]),
    ...statusValues.map((value) => ["阶段状态", value, "全流程", "标记跟进情况", "是"]),
    ...terminationReasons.map((value) => ["终止原因", value, "终止", "终止流程时必填", "是"]),
  ];
  dictionary.getRangeByIndexes(1, 0, dictionaryRows.length, 5).values = dictionaryRows;
  dictionary.getRange(`A1:E${dictionaryRows.length + 1}`).format.borders = { preset: "insideHorizontal", style: "thin", color: "#E6EDF2" };
  dictionary.getRange("A:E").format.columnWidth = 22;
  dictionary.getRange("D:D").format.columnWidth = 36;
  dictionary.freezePanes.freezeRows(1);

  review.getRange("A1:K1").merge();
  review.getRange("A1").values = [[`${roleName}｜招聘复盘口径（脱敏聚合）`]];
  review.getRange("A1").format = { fill: "#0B2239", font: { bold: true, color: "#FFFFFF", size: 15 } };
  review.getRange("A3:C3").values = [["主阶段", "候选人数量", "口径"]];
  styleHeader(review.getRange("A3:C3"));
  review.getRangeByIndexes(3, 0, stageValues.length, 1).values = stageValues.map((value) => [value]);
  review.getRange(`B4`).formulas = [["=COUNTIF('候选人台账'!$T$4:$T$303,A4)"]];
  review.getRange(`B4:B${stageValues.length + 3}`).fillDown();
  review.getRangeByIndexes(3, 2, stageValues.length, 1).values = stageValues.map(() => ["按当前主阶段统计；不含候选人级数据"]);
  review.getRange("E3:G3").values = [["简历来源", "候选人数量", "口径"]];
  styleHeader(review.getRange("E3:G3"));
  review.getRangeByIndexes(3, 4, sourceValues.length, 1).values = sourceValues.map((value) => [value]);
  review.getRange("F4").formulas = [["=COUNTIF('候选人台账'!$M$4:$M$303,E4)"]];
  review.getRange(`F4:F${sourceValues.length + 3}`).fillDown();
  review.getRangeByIndexes(3, 6, sourceValues.length, 1).values = sourceValues.map(() => ["按简历来源统计"]);
  review.getRange("I3:K3").values = [["终止原因", "候选人数量", "口径"]];
  styleHeader(review.getRange("I3:K3"));
  review.getRangeByIndexes(3, 8, terminationReasons.length, 1).values = terminationReasons.map((value) => [value]);
  review.getRange("J4").formulas = [["=COUNTIF('候选人台账'!$AO$4:$AO$303,I4)"]];
  review.getRange(`J4:J${terminationReasons.length + 3}`).fillDown();
  review.getRangeByIndexes(3, 10, terminationReasons.length, 1).values = terminationReasons.map(() => ["仅统计已人工确认的终止原因"]);
  review.getRange("A3:K20").format.borders = { preset: "insideHorizontal", style: "thin", color: "#E6EDF2" };
  review.getRange("A:K").format.columnWidth = 18;
  review.getRange("C:C").format.columnWidth = 32;
  review.getRange("G:G").format.columnWidth = 22;
  review.getRange("K:K").format.columnWidth = 28;
  review.freezePanes.freezeRows(3);

  return workbook;
}

function getArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

export async function writeLedger({ roleName, outputPath }) {
  const workbook = await buildLedger(roleName);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const file = await SpreadsheetFile.exportXlsx(workbook);
  await file.save(outputPath);
  return outputPath;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && pathToFileURL(process.argv[1]).href === pathToFileURL(currentFile).href) {
  const roleName = getArgument("--role") ?? "示例岗位";
  const outputPath = getArgument("--out") ?? path.join("workflow", "examples", roleName, "candidate-ledger.xlsx");
  await writeLedger({ roleName, outputPath });
  console.log(`已生成：${outputPath}`);
}
