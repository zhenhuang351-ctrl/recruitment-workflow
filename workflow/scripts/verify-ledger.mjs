import ExcelJS from "exceljs";
const ledgerPath = process.argv[2]; if (!ledgerPath) throw new Error("请传入台账路径。"); const workbook = new ExcelJS.Workbook(); await workbook.xlsx.readFile(ledgerPath); for (const name of ["候选人台账", "状态字典", "复盘口径", "选项配置"]) if (!workbook.getWorksheet(name)) throw new Error(`缺少工作表：${name}`); console.log("验证完成：台账结构完整。");
