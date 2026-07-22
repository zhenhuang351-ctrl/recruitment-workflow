# Recruitment Evidence Workflow

一套可放进 Codex、ChatGPT、Claude、Cursor 等常见 AI 工具中使用的本地招聘工作流。它不连接招聘平台、不自动外联；AI 负责整理招聘证据，招聘者负责标准、例外和不可逆决策。

## 你怎么开始

1. 把整个 `workflow` 文件夹放在一个本地项目中，并让 AI 先阅读 `AGENTS.md`。
2. 新建岗位时，把 `templates/岗位澄清提示词.md` 和岗位名称/JD/业务背景发给 AI。AI 一次问一个问题，确认后生成该岗位的 `ROLE_STANDARD.md` 与 `SOURCING_STRATEGY.md`。
   在候选人处理前，还必须确认流程阶段名称与顺序，并生成 `PIPELINE.json`。
3. 为岗位运行台账生成器。每个岗位独立保留一份 `candidate-ledger.xlsx`。
4. 上传或粘贴已授权的简历，并使用 `templates/简历评估提示词.md`。先让 AI 输出结构化简历和证据卡；确认后再创建候选人档案和台账行。
5. 电话后粘贴已授权的沟通摘要，使用 `templates/电话沟通提示词.md`；面试后粘贴反馈，使用 `templates/面试反馈提示词.md`。

## 目录约定

```text
workflow/
├─ AGENTS.md                 # 跨 AI 的路由与人工确认边界
├─ 00-招聘规则.md             # 年龄、年限、隐私和流程规则
├─ templates/                # 可复制提示词和文件模板
├─ scripts/                  # 一岗一表/脱敏复盘页生成器
├─ roles/                    # 你的私有岗位工作区（默认不提交）
└─ skills/                   # 可移植的 Skill 定义
```

## 年龄与工作年限

年龄会保留在台账中。每个岗位澄清时，AI 都会问：是否有年龄要求、它是评分参考还是硬性标准、适用范围与信息缺失时怎么办。工作年限也要明确是总工作年限、对口岗位年限、对口项目年限，还是组合。没有被岗位负责人确认的规则，不参与判断。

即便配置为硬性标准，AI 也只提示“待人工确认”，不会自行拒绝候选人或结束流程。

## 生成一岗一表

```powershell
node workflow/scripts/create-role-ledger.mjs --role "岗位名称" --pipeline "岗位/岗位名称/PIPELINE.json" --out "岗位/岗位名称/candidate-ledger.xlsx"
```

复盘页使用团队已有的 `index.html` 作为唯一 HTML 看板；不再使用简易生成页覆盖它。

## 让看板自动带入台账

首次将 `index.html` 放入岗位目录后，可运行下面命令，把该岗位台账的数据同步进看板。之后直接打开 `index.html` 就会显示最新记录，原有的上传按钮仍可用于临时查看其他表格。

```powershell
node workflow/scripts/sync-dashboard-data.mjs `
  --ledger "岗位/岗位名称/candidate-ledger.xlsx" `
  --dashboard "岗位/岗位名称/index.html" `
  --role "岗位名称"
```

每次更新台账后再运行一次即可。这个同步过程只在本地读取 Excel 和改写 HTML，不调用 AI 模型，也不消耗模型 token。

## 数据边界

- Excel 是流程数据的唯一事实来源；候选人档案保存可追溯证据。
- HTML 复盘页只显示脱敏聚合数据，不显示候选人姓名、年龄、薪资、简历和沟通原文。
- 任何外联、约面、拒绝、录用、终止流程或修改岗位规则，均由招聘者人工确认。
