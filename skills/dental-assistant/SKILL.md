---
name: dental-assistant
version: 0.1.0
description: "牙医 AI 助理：通过自然语言完成患者建档、SOAP 病历记录、治疗计划文档生成、术后随访与口腔健康教育推送。基于飞书 Base（患者档案）、Docs（治疗计划）、IM（随访消息）、Calendar（复诊提醒）、Task（跟进）。当用户表述为牙科诊疗记录、为患者出治疗方案、安排术后随访、推送术后护理或口腔健康教育内容时使用。"
metadata:
  requires:
    bins: ["lark-cli"]
    skills: ["lark-shared", "lark-base", "lark-doc", "lark-im", "lark-calendar", "lark-task"]
---

# dental-assistant (v0.1.0)

**CRITICAL — 开始前 MUST 先用 Read 工具读取 [`../lark-shared/SKILL.md`](../lark-shared/SKILL.md)，其中包含认证、权限处理。**

> 设计依据：见同目录 [`DESIGN.md`](./DESIGN.md)
>
> **免责声明**：本 Skill 是工作流助手，不输出最终诊断结论。任何治疗计划必须由执业牙医确认。

---

## 1. 适用判断

满足以下任一条件时使用本 Skill：
- 用户身份是**牙医**，且话题涉及患者就诊记录、治疗方案、术后随访、口腔健康教育。
- 输入中出现牙科术语：牙位（FDI 编号 11~48）、根管、修复、正畸、种植、洁牙、龋齿、SOAP 等。
- 用户要求"建档/写病历/出方案/发随访/推护理"等动作，且上下文为口腔诊所。

**不适用**：患者本人直接问诊、影像 AI 分析、医保结算 — 礼貌引导到对应人工流程。

---

## 2. 一次性初始化（首次使用前完成）

牙医首次使用前需要在飞书内准备好 Base 应用（一个多维表格 app）。Skill 自动检测，没有则引导创建。

### 2.1 检测是否已初始化

读取用户配置：先用 `lark-cli config get dental.base_app_token`。若返回为空，进入 2.2。

### 2.2 创建 Base 应用与四张表

```bash
# 1) 在指定文件夹创建多维表格（folder_token 可由用户提供，默认根目录）
lark-cli bitable apps create --data '{"name":"牙科诊所助理"}'
# 记录返回的 app_token，后续所有表都建在此应用下

# 2) 建表：patients / visits / treatment_plans / followups
#    字段结构见 docs/dental-assistant-design.md §5
#    使用 base 的 table create + field create，必要时先 schema 查参数
lark-cli schema bitable.app.table.create
```

字段最小集合（V1）：

| 表 | 必建字段 |
|----|---------|
| patients | name, gender, birthday, phone, allergies, medical_history |
| visits | patient(关联), visit_date, chief_complaint, soap_s/o/a/p, tooth_position, dentist |
| treatment_plans | patient(关联), doc_url, stages, est_cost, status |
| followups | visit(关联), scheduled_at, channel, template, reply, status |

完成后把四张表的 `table_id` 与 `app_token` 写回配置：

```bash
lark-cli config set dental.base_app_token <APP_TOKEN>
lark-cli config set dental.tables.patients <TABLE_ID>
lark-cli config set dental.tables.visits <TABLE_ID>
lark-cli config set dental.tables.plans  <TABLE_ID>
lark-cli config set dental.tables.followups <TABLE_ID>
```

---

## 3. 核心工作流

### 3.1 `register-patient` — 新建患者档案

**触发**：用户说"登记一个新患者 / 建档 / 新增患者"。

**步骤**：
1. 从自然语言抽取字段：`name`（必填）、`gender`、`birthday/age`、`phone`、`allergies`、`medical_history`。**缺少 `name` 时反问，其它字段缺失允许为空**。
2. 检查重复：按 `name + phone` 在 patients 表中查询（`base data query`）。命中则反问"是否已有档案，是否要打开 / 还是新建？"
3. 写入：

   ```bash
   lark-cli bitable app.table.record create \
     --params '{"app_token":"<APP>","table_id":"<TID_patients>"}' \
     --data '{"fields":{"name":"张三","gender":"男","phone":"138...","allergies":"青霉素","medical_history":"高血压"}}'
   ```
4. 回复中给出新建的 `patient_id` 与 Base 行链接。

### 3.2 `record-visit` — 记录一次就诊（SOAP）

**触发**："给 X 记一次就诊 / 写病历 / 复诊记录"。

**步骤**：
1. 解析患者：先按姓名在 patients 表查询；多条命中时列出让医生选。
2. 把自由文本拆成 SOAP 四段：
   - **S（主观）**：患者自述、主诉、症状变化。
   - **O（客观）**：检查所见、影像、牙周指数、咬合。
   - **A（评估）**：当前诊断 / 阶段。
   - **P（计划）**：今日处置 + 下一步。
3. 抽取牙位（FDI 编号），存入 `tooth_position` 多选字段。
4. 写入 visits 表，`patient` 字段关联到 §3.2.1 找到的记录。
5. 若 `P` 段中提到"X 天/X 周后复诊"，提示是否调用 §3.4 创建日程。

**SOAP 拆分提示词参考**：

> 你是牙科病历助手。把下面这段医生口述拆成 SOAP 四段。
> 规则：
> - S 只包含患者自述（疼痛、不适、自我评价的变化）。
> - O 包含检查、测量、影像所见、操作过程客观记录。
> - A 是医生对当前情况的判断（诊断或阶段评估）。
> - P 是今日处置 + 下一步计划。
> - 牙位用 FDI 二位数（11~48），多个用逗号分隔。
> - 不臆造，原文未提的字段留空。

### 3.3 `make-treatment-plan` — 出治疗计划

**触发**："出方案 / 治疗计划 / 给 X 一份种植/正畸/根管方案"。

**步骤**：
1. 定位患者；如无活跃就诊则提示先 `record-visit`。
2. 选模板：根管 / 修复（嵌体/全冠） / 种植 / 正畸 / 牙周 / 拔牙。模板存于 Wiki，从 `lark-cli wiki search` 取。
3. 生成飞书文档（Markdown → docs create）：

   ```bash
   lark-cli docs +create-from-md --title "治疗计划-张三-26根管+全瓷冠" --md @plan.md
   ```

   `plan.md` 模板骨架：

   ```markdown
   # 治疗计划

   > 患者：{name}（{patient_id}） | 主诊医生：{dentist} | 日期：{date}

   ## 临床概况
   - 主诉：...
   - 检查：...
   - 诊断：...

   ## 治疗方案
   | 阶段 | 步骤 | 预计次数 | 预计费用 |
   |------|------|---------|---------|
   | 1 | ... | ... | ... |

   ## 风险与告知
   - ...

   ## 知情同意
   患者签字：________  日期：________

   ---
   *本方案由 AI 辅助生成，最终方案以面诊为准。*
   ```
4. 在 treatment_plans 表中新增一行，写入 `doc_url`、`stages` 摘要、`est_cost`、`status=待确认`。
5. 把文档分享链接发给医生，并提示"是否发给患者？"（V1 走手动转发）。

### 3.4 `schedule-followup` — 术后随访编排

**触发**："给 X 安排随访 / 拔牙后随访 / 术后跟进"。

**步骤**：
1. 定位本次就诊 `visit_id`；从 P 段或医生显式输入识别**术式**（拔牙/根管/种植/正畸/洁牙）。
2. 按术式装配随访时间表（默认值，可被医生覆盖）：

   | 术式 | 触达节点 |
   |------|---------|
   | 拔牙 | D+1 须知 / D+3 问卷 / D+7 复诊提醒 |
   | 根管 | D+1 须知 / D+7 复诊 |
   | 种植 | D+1 须知 / D+3 问卷 / D+14 拆线 / 3 月复查 |
   | 正畸 | 每月复诊 + 每月护理推送 |
   | 洁牙 | 6 月后定期检查提醒 |

3. 对每个节点：
   - 在 followups 表写一行（`status=待发`, `scheduled_at=触达时间`, `template=术式`）。
   - 用 `lark-cli task +create` 建一个跟进任务，挂在医生名下，截止时间 = `scheduled_at + 1d`。
   - 若节点是"复诊"，调用 `lark-cli calendar event create` 在医生日历上建议时段（标记为待患者确认）。

4. 回复总览给医生：列出 N 个节点，并提示"在 D+X 之前回复将自动关闭对应任务"。

### 3.5 `push-education` — 推送护理 / 健康教育

**触发**："给 X 发拔牙后护理 / 正畸第 1 个月须知 / 洁牙后注意事项"。

**步骤**：
1. 模板定位：先 `lark-cli wiki search` 查关键字"拔牙术后须知 / 正畸护理 / 种植术后"。命中多条由医生选。
2. 取出 wiki 文档内容（`docs get-content`），渲染成 IM 卡片（标题 + 要点 + 联系电话）。
3. 通过医生与患者的私聊会话推送：

   ```bash
   lark-cli im +send --to <patient_chat_id> --card @card.json
   ```

   *V1 患者 chat_id 由医生在 patients 表里手动维护一次（chat_id 字段为可选扩展）。*
4. 在 followups 表登记一行 `channel=IM, template=<术式>, status=已发`。

---

## 4. 通用规约

### 4.1 输出风格
- **简短**：每次只问医生最关键的一两个问题；不要逐字段反问。
- **预览后再写**：任何写入 Base / Docs / IM 的操作，先把要写的内容**摘要展示**给医生，等"确认"再执行。
- **链接回执**：所有写入完成后，附上对应 Base 行或文档的飞书链接。

### 4.2 错误处理
- 找不到患者：列出最相似的 3 条让医生选，**不要**自动新建。
- API 失败（403/429）：参考 `../lark-shared/SKILL.md` 中的权限和限流处理。
- 字段不存在：提示用户运行 §2.2 完成初始化，不要自己改 schema。

### 4.3 隐私
- 不在回复中重复完整身份证号、家庭住址。
- 不把患者 PII 发送到非授权用户的私聊。
- 治疗计划文档**默认不公开**：`docs create` 时 permission 设为"指定人可读"。

---

## 5. 命令速查

| 工作流 | 主要 lark-cli 命令 |
|--------|------------------|
| register-patient | `bitable app.table.record create` |
| record-visit | `bitable app.table.record search` + `record create` |
| make-treatment-plan | `docs +create-from-md` + `bitable record create` |
| schedule-followup | `bitable record create` × N + `task +create` + `calendar event create` |
| push-education | `wiki search` + `docs get-content` + `im +send` |

调用任何原生 API 前先 `lark-cli schema <service>.<resource>.<method>` 查参数结构，**不要凭记忆拼字段**。

---

## 6. 权限表（最小集合）

| 用途 | scope |
|------|-------|
| 读写患者/就诊/方案/随访 Base | `bitable:app` |
| 创建治疗计划文档 | `docx:document`, `drive:drive` |
| 发送随访 / 教育 IM | `im:message`, `im:message:send_as_bot` |
| 创建复诊日程 | `calendar:calendar` |
| 创建跟进任务 | `task:task` |
| 查询健康教育 Wiki | `wiki:wiki:readonly` |

具体 scope 名以飞书开放平台为准；首次调用时按 `lark-shared` 的权限引导流程申请。
