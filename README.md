# Recruitment Workflow

一个可放在本地文件夹、可在 Codex、ChatGPT、Claude 或 Cursor 中重复使用的招聘证据工作流。它将岗位澄清、寻源策略、简历证据、电话沟通、面试反馈和招聘复盘连成同一条可追溯链路。

## 它解决什么问题

招聘的难点不只是匹配关键词，而是先把“什么叫合适”说清楚，并在每一步保留判断依据。本项目让 AI 承担材料整理、证据定位、缺口提醒与草稿生成；招聘者和业务方仍负责标准确认、例外判断和所有不可逆决定。

```text
岗位需求澄清 → 岗位标准与寻源策略 → 简历证据卡 → 电话沟通回写
                                              ↓
                     候选人台账（每个岗位一张表） ← 面试反馈/决策会
                                              ↓
                               HTML 招聘复盘与人工校准
```

## 目录与事实源

```text
workflow/
├── AGENTS.md                 # 总入口：任何 AI 先读的路由与边界
├── 00-招聘规则.md             # 全局规则
├── templates/                # 可复制到新岗位的模板与提示词
├── roles/<岗位名称>/
│   ├── CONTEXT.md            # 已确认规则、待确认问题、下一步
│   ├── ROLE_STANDARD.md      # 版本化岗位标准与评分口径
│   ├── SOURCING_STRATEGY.md  # 公司、Title、项目、技能与检索式
│   ├── KEYWORD_ITERATIONS.md # 有证据的关键词观察
│   ├── FEEDBACK_ITERATIONS.md
│   ├── candidate-ledger.xlsx # 候选人流程唯一事实源
│   └── index.html            # 可由台账重建的脱敏展示层
└── skills/                   # 可移植的 AI Skill 定义
```

候选人流程事实只写入该岗位的 Excel 台账；逐人简历证据、电话纪要和面试档案使用 Markdown 保存；`index.html` 只负责展示，永远不反向改写台账。

## 四个可复用 Skill

- `recruit-router`：识别当前请求属于哪个环节，并先读对的事实源。
- `recruit-grill`：一次只问一个问题，将模糊 JD 收敛成岗位标准和搜寻策略。
- `resume-evidence-review`：产出结构化简历、证据卡、待核实项与电话问题。
- `feedback-calibration`：分层记录面试反馈，避免把其他岗位的条件误写回当前岗位。

Skill 定义在 [workflow/skills](workflow/skills)。复制目录到支持该格式的 AI 工具配置中即可使用；没有安装 Skill 的工具也可直接从 `workflow/AGENTS.md` 开始，按模板互动执行。

## 核心边界

- 没有岗位标准时，只澄清需求，不给候选人黑箱分数。
- 分数只描述已出现的能力证据；信息缺失一律标为 **待核实**，不作隐性扣分。
- 年龄、学历和工作年限必须在岗位澄清中明确：是硬性标准、评分参考还是仅作电话核实；没有确认的规则不得自行使用。
- 反馈必须区分：流程事实、能力判断、当前岗位匹配、转推荐条件、待澄清问题。
- “其他岗位需要 C 端经验”不能自动变成当前岗位的淘汰条件；范围模糊时先问“这条判断适用于当前岗位还是转推荐岗位？”。
- 不抓取招聘平台，不自动打招呼、约面、拒绝、淘汰、录用或改写规则。所有这些动作都需要人工确认。

## 快速开始

1. 复制 `workflow/templates` 新建一个岗位目录，并创建该岗位专属的 `candidate-ledger.xlsx`。
2. 在 AI 对话中让它先读取 `workflow/AGENTS.md`，然后输入岗位名称、JD 和背景信息。
3. 按“澄清 → 确认标准 → 简历评估 → 电话回写 → 面试反馈 → 复盘”推进。每轮完成后把确认的事实写回本地文件。
4. 用台账同步生成该岗位的 `index.html`，查看漏斗、阶段时效、终止原因和待办。

## 验证

安装 Node.js 后运行：

```bash
npm.cmd install
npm.cmd test
```

## 参考与致谢

方法论参考了 [Viy1204/recruiting-copilot 的设计文档](https://github.com/Viy1204/recruiting-copilot/blob/master/docs/DESIGN.md) 关于“岗位标准先行、记录可追溯、不可逆动作由人确认”的原则。本文档、数据结构、模板与 Skill 为独立撰写；本项目不包含招聘平台自动化。
