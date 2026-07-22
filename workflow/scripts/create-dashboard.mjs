import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";
import { stageValues, terminationReasons } from "./create-role-ledger.mjs";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function metricList(items) {
  return items.map(({ label, count }) => `
    <li><span>${escapeHtml(label)}</span><strong>${Number(count) || 0}</strong></li>`).join("");
}

export function buildDashboard({ role, stages = [], sources = [], terminationReasons = [] }) {
  const total = stages.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(role)}｜招聘复盘</title>
  <style>
    :root { color-scheme: light; --ink:#102a43; --muted:#627d98; --line:#d9e2ec; --card:#ffffff; --surface:#f0f4f8; --accent:#0f766e; }
    * { box-sizing:border-box; } body { margin:0; background:var(--surface); color:var(--ink); font:15px/1.5 Inter, "Microsoft YaHei", sans-serif; }
    main { max-width:1000px; margin:0 auto; padding:40px 24px 64px; } h1 { margin:0 0 6px; font-size:28px; } .hint { color:var(--muted); margin:0; }
    .total { display:inline-block; margin:22px 0; padding:12px 16px; border-radius:10px; background:#dff7f3; color:#075e54; font-weight:700; }
    .grid { display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:16px; } section { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:18px; }
    h2 { margin:0 0 12px; font-size:17px; } ul { list-style:none; padding:0; margin:0; } li { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 0; border-bottom:1px solid #edf2f7; } li:last-child { border-bottom:0; } strong { min-width:28px; text-align:right; color:var(--accent); }
    footer { margin-top:24px; color:var(--muted); font-size:13px; } @media (max-width:720px) { .grid { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(role)}｜招聘复盘</h1>
    <p class="hint">仅展示已汇总的流程数据；候选人级信息仅保存在本地台账。</p>
    <p class="total">当前流程候选人合计：${total}</p>
    <div class="grid">
      <section><h2>流程阶段</h2><ul>${metricList(stages)}</ul></section>
      <section><h2>简历来源</h2><ul>${metricList(sources)}</ul></section>
      <section><h2>终止原因</h2><ul>${metricList(terminationReasons)}</ul></section>
    </div>
    <footer>生成日期：${new Date().toISOString().slice(0, 10)}。请以 candidate-ledger.xlsx 为唯一事实来源。</footer>
  </main>
</body>
</html>`;
}

function countBy(rows, index) {
  const counts = new Map();
  for (const row of rows) {
    const value = row[index];
    if (typeof value === "string" && value.trim()) counts.set(value.trim(), (counts.get(value.trim()) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

function withZeroCounts(labels, observed) {
  const observedMap = new Map(observed.map((item) => [item.label, item.count]));
  return labels.map((label) => ({ label, count: observedMap.get(label) ?? 0 }));
}

export async function summarizeLedgerWorkbook(workbook, role) {
  const ledger = workbook.worksheets.getItem("候选人台账");
  const rows = ledger.getRange("A4:AS303").values;
  return {
    role,
    stages: withZeroCounts(stageValues, countBy(rows, 19)),
    sources: withZeroCounts(["内部人才库", "员工推荐", "招聘平台", "猎头", "官网投递", "活动/社群", "其他"], countBy(rows, 12)),
    terminationReasons: withZeroCounts(terminationReasons, countBy(rows, 40)),
  };
}

export async function summarizeLedgerFile(ledgerPath, role) {
  const file = await FileBlob.load(ledgerPath);
  const workbook = await SpreadsheetFile.importXlsx(file);
  return summarizeLedgerWorkbook(workbook, role);
}

function parseArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

export async function writeDashboard({ outputPath, data }) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, buildDashboard(data), "utf8");
  return outputPath;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && pathToFileURL(process.argv[1]).href === pathToFileURL(currentFile).href) {
  const role = parseArgument("--role") ?? "示例岗位";
  const out = parseArgument("--out") ?? path.join("workflow", "examples", role, "dashboard.html");
  const ledgerPath = parseArgument("--ledger");
  const data = ledgerPath
    ? await summarizeLedgerFile(ledgerPath, role)
    : {
        role,
        stages: [{ label: "0-简历待评估", count: 0 }, { label: "1-电话沟通", count: 0 }],
        sources: [{ label: "员工推荐", count: 0 }],
        terminationReasons: [{ label: "Base 不符", count: 0 }],
      };
  await writeDashboard({
    outputPath: out,
    data,
  });
  console.log(`已生成：${out}`);
}
