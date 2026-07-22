import fs from "node:fs/promises";
import path from "node:path";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const inputPath = process.argv[2];
if (!inputPath) {
  throw new Error("请传入待验证的台账路径，例如：node workflow/scripts/verify-ledger.mjs 岗位/岗位名称/candidate-ledger.xlsx");
}
const outputDir = "workflow/verification";
const input = await FileBlob.load(inputPath);
const workbook = await SpreadsheetFile.importXlsx(input);

const sheets = await workbook.inspect({ kind: "sheet", include: "id,name" });
const summary = await workbook.inspect({
  kind: "table",
  range: "候选人台账!A1:AS6",
  include: "values,formulas",
  tableMaxRows: 6,
  tableMaxCols: 45,
});
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "formula error scan",
});

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(path.join(outputDir, "ledger-inspection.txt"), `${sheets.ndjson}\n${summary.ndjson}\n${errors.ndjson}`, "utf8");

for (const sheetName of ["候选人台账", "状态字典", "复盘口径", "选项配置"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  await fs.writeFile(path.join(outputDir, `${sheetName}.png`), new Uint8Array(await preview.arrayBuffer()));
}

console.log("验证完成：已检查关键范围、公式错误并渲染四张工作表。");
