import fs from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const DATA_START = "/* AUTO_LEDGER_DATA:START */";
const DATA_END = "/* AUTO_LEDGER_DATA:END */";
const LOADER_START = "/* AUTO_LEDGER_LOADER:START */";
const LOADER_END = "/* AUTO_LEDGER_LOADER:END */";

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function removeMarkedBlock(html, start, end) {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(new RegExp(`\\s*${escapedStart}[\\s\\S]*?${escapedEnd}\\s*`, "g"), "\n");
}

export function rowsFromLedgerValues(values, role) {
  const [headers = [], ...dataRows] = values;
  const columnNames = headers.map((header) => String(header ?? "").trim());
  return dataRows
    .filter((row) => row.some(hasValue))
    .map((row) => {
      const record = {};
      columnNames.forEach((columnName, index) => {
        if (columnName) record[columnName] = row[index] ?? "";
      });
      record.岗位 = role;
      record.__sheetName = role;
      record.jobNameFromSheet = role;
      return record;
    });
}

const reviewStageDates = [
  ["决策会日期", "6-决策会"],
  ["HRBP日期", "5-HRBP"],
  ["三面日期", "4-终面/交叉面"],
  ["二面日期", "3-业务二面"],
  ["一面日期", "2-业务一面"],
];

export function prepareReviewRows(rows) {
  return rows.map((row) => {
    if (String(row["主阶段"] || "").trim() !== "终止") return { ...row };
    const datedStage = reviewStageDates.find(([dateColumn]) => hasValue(row[dateColumn]));
    if (datedStage) return { ...row, "主阶段": datedStage[1], "阶段状态": "终止" };
    if (String(row["终止原因"] || "").includes("简历不匹配")) {
      return { ...row, "主阶段": "0-简历待评估", "阶段状态": "终止" };
    }
    return { ...row };
  });
}

function buildDataBlock(rows) {
  return `${DATA_START}\n    const AUTO_DASHBOARD_DATA = ${safeJson(rows)};\n    ${DATA_END}`;
}

function buildLoaderBlock() {
  return `${LOADER_START}
    function loadAutoLedgerData() {
      if (!Array.isArray(AUTO_DASHBOARD_DATA) || AUTO_DASHBOARD_DATA.length === 0) return;

      manualColumnMappingActive = false;
      autoImportWarnings = [];
      sheetColumnMappings = {};
      const rowsBySheet = new Map();
      AUTO_DASHBOARD_DATA.forEach((row) => {
        const sheetName = row.__sheetName || row.jobNameFromSheet || '岗位台账';
        const rows = rowsBySheet.get(sheetName) || [];
        rows.push(row);
        rowsBySheet.set(sheetName, rows);
      });
      rowsBySheet.forEach((rows, sheetName) => {
        const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row).filter((key) => !['__sheetName', 'jobNameFromSheet'].includes(key)))));
        sheetColumnMappings[sheetName] = buildSheetColumnMapping(sheetName, columns, rows);
      });

      rawData = transformData(AUTO_DASHBOARD_DATA);
      if (rawData.length === 0) {
        showPageMessage('自动读取台账后未识别到可用于复盘的候选人数据，请检查台账阶段字段。', 'info');
        return;
      }
      document.getElementById('emptyState').classList.add('hidden');
      document.getElementById('mainContent').classList.add('active');
      initTimeSelectors();
      refreshData();
      showPageMessage('已自动载入 ' + rawData.length + ' 条候选人记录；仍可使用上传按钮查看其他表格。', 'success');
    }
    ${LOADER_END}`;
}

export function injectAutoLedgerData(html, rows) {
  let output = removeMarkedBlock(html, DATA_START, DATA_END);
  output = removeMarkedBlock(output, LOADER_START, LOADER_END);

  const dataMarker = "let rawData = [];";
  if (!output.includes(dataMarker)) throw new Error("未找到看板数据初始化位置，未写入任何内容。");
  output = output.replace(dataMarker, `${dataMarker}\n    ${buildDataBlock(rows)}`);

  const loaderMarker = "function getStageNameByCode";
  if (!output.includes(loaderMarker)) throw new Error("未找到看板数据转换位置，未写入任何内容。");
  output = output.replace(loaderMarker, `${buildLoaderBlock()}\n\n    ${loaderMarker}`);

  const bootMarker = "document.getElementById('timeDimension').addEventListener('change', function() {";
  if (!output.includes(bootMarker)) throw new Error("未找到看板初始化位置，未写入任何内容。");
  output = output.replace(bootMarker, `if (AUTO_DASHBOARD_DATA.length > 0) loadAutoLedgerData();\n\n    ${bootMarker}`);
  return output;
}

export async function syncDashboard({ ledgerPath, dashboardPath, role, sheetName = "候选人台账" }) {
  const ledgerFile = await FileBlob.load(ledgerPath);
  const workbook = await SpreadsheetFile.importXlsx(ledgerFile);
  const ledgerSheet = workbook.worksheets.getItem(sheetName);
  const values = ledgerSheet.getRange("A3:AS303").values;
  const rows = prepareReviewRows(rowsFromLedgerValues(values, role));
  const dashboard = await fs.readFile(dashboardPath, "utf8");
  const updatedDashboard = injectAutoLedgerData(dashboard, rows);
  await fs.writeFile(dashboardPath, updatedDashboard, "utf8");
  return { count: rows.length, dashboardPath };
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && pathToFileURL(process.argv[1]).href === pathToFileURL(currentFile).href) {
  const ledgerPath = argumentValue("--ledger");
  const dashboardPath = argumentValue("--dashboard");
  const role = argumentValue("--role") ?? "岗位台账";
  const sheetName = argumentValue("--sheet") ?? "候选人台账";
  if (!ledgerPath || !dashboardPath) {
    throw new Error("用法：node workflow/scripts/sync-dashboard-data.mjs --ledger <candidate-ledger.xlsx> --dashboard <dashboard.html> --role <岗位名称>");
  }
  const result = await syncDashboard({ ledgerPath, dashboardPath, role, sheetName });
  console.log(`已将 ${result.count} 条候选人记录同步到：${result.dashboardPath}`);
}
