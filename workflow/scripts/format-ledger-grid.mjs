import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const ledgerPath = process.argv[2];
if (!ledgerPath) throw new Error("用法：node workflow/scripts/format-ledger-grid.mjs <candidate-ledger.xlsx>");

const input = await FileBlob.load(ledgerPath);
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("候选人台账");

const dataRange = sheet.getRange("A3:AS303");
dataRange.format.borders = { preset: "all", style: "thin", color: "#D6DEE6" };
dataRange.format.horizontalAlignment = "center";
dataRange.format.verticalAlignment = "center";
sheet.getRange("A3:AS3").format.borders = { preset: "all", style: "thin", color: "#9DB0C0" };
sheet.getRange("L4:L303").format.numberFormat = "yyyy-mm-dd";
sheet.getRange("L3").values = [["简历收取时间"]];

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(ledgerPath);
console.log(`已统一网格线并规范简历收取时间：${ledgerPath}`);
