import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const formalDashboardTemplate = path.resolve(here, "../templates/recruitment-review-dashboard.html");

export async function createReviewDashboard(outputPath) {
  try {
    await fs.access(outputPath);
    throw new Error(`看板已存在：${outputPath}。为避免覆盖已同步的数据，请使用现有文件或另存为新文件。`);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.copyFile(formalDashboardTemplate, outputPath);
  return outputPath;
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(currentFile).href) {
  const outputPath = argument("--out");
  if (!outputPath) throw new Error("用法：node workflow/scripts/create-review-dashboard.mjs --out <岗位目录/index.html>");
  console.log(`已创建正式复盘看板：${await createReviewDashboard(outputPath)}`);
}
