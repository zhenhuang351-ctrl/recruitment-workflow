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
├── AGENTS.md                 # AI 的工作入口：路由、必读文件、事实源与人工确认边界
├── 00-招聘规则.md             # 全局招聘规则：年龄、年限、隐私、流程状态与人工决策边界
├── README.md                 # 可单独复制 workflow/ 时的精简使用说明；完整说明见本文件
├── templates/                # 岗位澄清、简历评估、电话沟通、面试反馈等可复制模板
├── scripts/                  # 创建台账、创建正式复盘看板、同步台账数据的本地脚本
├── roles/<岗位名称>/
│   ├── CONTEXT.md            # 已确认规则、待确认问题、下一步
│   ├── PIPELINE.json         # 已确认的流程阶段名称、顺序与状态
│   ├── ROLE_STANDARD.md      # 版本化岗位标准与评分口径
│   ├── SOURCING_STRATEGY.md  # 公司、Title、项目、技能与检索式
│   ├── KEYWORD_ITERATIONS.md # 有证据的关键词观察
│   ├── FEEDBACK_ITERATIONS.md
│   ├── candidate-ledger.xlsx # 候选人流程唯一事实源
│   └── index.html            # 从正式看板模板创建：漏斗、来源、流失原因与时效数据
└── skills/                   # 可移植的 AI Skill 定义
```

同一岗位的候选人流程信息（例如所处阶段、约面日期、终止原因）统一以 Excel 台账为准；每位候选人的简历证据、电话纪要和面试反馈另存为 Markdown 档案。岗位目录中的 `index.html` 从正式招聘复盘看板模板创建：用于查看招聘漏斗、阶段人数与时效、简历来源、终止/流失原因和待跟进事项。请先更新 Excel，再同步看板，不要在看板中直接修改流程信息。

## 设计与流程配置说明

- [设计说明](docs/DESIGN.md)：项目解决的问题、数据边界、人工确认机制与反馈校准原则。
- [流程配置说明](docs/PIPELINE-CONFIG-DESIGN.md)：不同岗位如何确认阶段名称与顺序，并让 Excel 台账和招聘复盘看板使用同一套流程。

## 让 AI 开始工作

将整个 `workflow/` 目录放入 AI 可访问的本地工作区后，只需让 AI 先读取 [AGENTS.md](workflow/AGENTS.md)。它会根据任务按需读取对应岗位的规则、标准、台账和模板，无需你逐个上传 Markdown 文件。

- [全局招聘规则：00-招聘规则.md](workflow/00-招聘规则.md)：年龄、工作年限、隐私、流程状态与人工确认边界。
- [工作流包说明：workflow/README.md](workflow/README.md)：复制 `workflow/` 后，各 Markdown 文件与目录分别承担什么职责。

## 四个可复用 Skill

- `recruit-router`：识别当前请求属于哪个环节，并先读对的事实源。
- `recruit-grill`：一次只问一个问题，将模糊 JD 收敛成岗位标准和搜寻策略。
- `resume-evidence-review`：产出结构化简历、证据卡、待核实项与电话问题。
- `feedback-calibration`：整理面试反馈，沉淀可用于优化岗位标准、电话问题或搜寻策略的证据。

Skill 定义在 [workflow/skills](workflow/skills)。复制目录到支持该格式的 AI 工具配置中即可使用；没有安装 Skill 的工具也可直接从 `workflow/AGENTS.md` 开始，按模板互动执行。

## 核心边界

- 没有岗位标准时，只澄清需求，不给候选人黑箱分数。
- 分数只描述已出现的能力证据；信息缺失一律标为 **待核实**，不作隐性扣分。
- 年龄、学历和工作年限必须在岗位澄清中明确：是硬性标准、评分参考还是仅作电话核实；没有确认的规则不得自行使用。
- 反馈应区分：流程事实、能力反馈、岗位匹配判断、岗位级改进建议和待澄清问题。
- 反馈的适用岗位或环节不清楚时，先确认“这条反馈具体适用于哪个岗位或招聘环节？”，再决定是否更新岗位标准、电话问题或搜寻策略。
- 不抓取招聘平台，不自动打招呼、约面、拒绝、淘汰、录用或改写规则。所有这些动作都需要人工确认。

## 快速开始

1. 复制 `workflow/templates` 新建一个岗位目录，并创建该岗位专属的 `candidate-ledger.xlsx`。
2. 在 AI 对话中让它先读取 `workflow/AGENTS.md`，然后输入岗位名称、JD 和背景信息。
3. 按“澄清 → 确认标准 → 简历评估 → 电话回写 → 面试反馈 → 复盘”推进。录入简历时必须补齐简历来源与简历收取时间；每轮完成后把确认的事实写回本地文件。
4. 从正式招聘复盘看板模板创建该岗位的 `index.html`，同步台账后查看招聘漏斗、阶段时效、简历来源、流失原因和待办。

### 创建台账与正式复盘看板

岗位澄清并确认 `PIPELINE.json` 后，依次运行：

```powershell
node workflow/scripts/create-role-ledger.mjs --role "岗位名称" --pipeline "岗位/岗位名称/PIPELINE.json" --out "岗位/岗位名称/candidate-ledger.xlsx"

node workflow/scripts/create-review-dashboard.mjs --out "岗位/岗位名称/index.html"

node workflow/scripts/sync-dashboard-data.mjs `
  --ledger "岗位/岗位名称/candidate-ledger.xlsx" `
  --dashboard "岗位/岗位名称/index.html" `
  --role "岗位名称"
```

每次由 AI 和招聘者确认后更新台账，再运行最后一条同步命令。看板读取 Excel 中的主阶段、阶段状态、简历来源、收取时间和终止原因，并使用同一份阶段顺序生成漏斗。

## 验证

安装 Node.js 后运行：

```bash
npm.cmd install
npm.cmd test
```
