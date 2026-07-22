import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const skills = [
  "recruit-router",
  "recruit-grill",
  "resume-evidence-review",
  "feedback-calibration",
];

test("portable recruitment skills have concise metadata and human confirmation boundaries", async () => {
  for (const skill of skills) {
    const text = await readFile(`workflow/skills/${skill}/SKILL.md`, "utf8");
    assert.match(text, /^---\r?\nname: /);
    assert.match(text, /description: /);
    assert.match(text, /人工确认/);
  }
});

test("router skill retains ambiguity gate for current and transfer roles", async () => {
  const text = await readFile("workflow/skills/recruit-router/SKILL.md", "utf8");
  assert.match(text, /当前岗位还是转推荐岗位/);
  assert.match(text, /不得修改岗位标准、评分或搜寻策略/);
});
