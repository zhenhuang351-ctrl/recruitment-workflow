---
name: feedback-calibration
description: Record interview or decision feedback in separate layers, update a candidate only after approval, and propose evidence-backed calibration without self-changing hiring rules.
---

# 反馈归档与校准

读取当前岗位的 `CONTEXT.md`、`ROLE_STANDARD.md`、候选人档案、`candidate-ledger.xlsx`、`FEEDBACK_ITERATIONS.md` 和 `KEYWORD_ITERATIONS.md`。

先把反馈分为五层：流程事实、能力反馈、岗位匹配判断、岗位级改进建议、待澄清问题。若适用范围不清晰，先问“这条反馈具体适用于哪个岗位或招聘环节？”，并停在待澄清；不得修改岗位标准、评分或搜寻策略。

候选人进入暂缓或终止时，主阶段保留实际停留的流程节点，阶段状态分别写“暂缓”或“终止”。输出更新草稿，等待人工确认后才写回台账和候选人档案。

只聚合同一岗位、范围明确且人工确认过的反馈。少于 5 条同类有效反馈时记录观察；达到门槛后才可提出补充信号、维度说明、电话验证问题、建议年限或关键词的变化。任何变化都需要人工确认和新版本记录；禁止模型自行学习、静默调权或自动改规则。
