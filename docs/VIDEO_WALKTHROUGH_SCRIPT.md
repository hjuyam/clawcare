# ClawCare v0 视频讲解脚本（5~8 分钟）

> 目标：让观众在一次录屏里理解 **ClawCare 是什么**、**为什么“默认安全”**、以及 **如何走通核心闭环**：login → ops → tasks → config apply/rollback → security audit → memory list/search/detail。

---

## 0) 准备（录屏前 30 秒）

**画面**：终端 + 浏览器（推荐左右分屏）

- 终端：
  ```bash
  cd /root/aidev/clawcare
  npm run dev
  ```
- 浏览器打开：<http://localhost:3000>

**口播要点**：
- “ClawCare 是一个运维控制台（UI + 服务端 BFF），把运维动作纳入鉴权、RBAC、Safe Mode、二次确认、脱敏和审计。”
- “v0 里 Runs 的 executor 还是 mock——我们今天重点看的是：**可追踪闭环 + 默认安全护栏**。”

---

## 1) 登录（~1:00）

**画面**：进入 `/login`

**操作**：
1. 打开 `http://localhost:3000/login`
2. （可选）填写「用户 ID」（例如 `local-admin`）
3. 输入「TOTP」（本地演示可用 `DEV-BYPASS`，如启用）
4. 点击「登录」

**口播要点**：
- “登录成功后会写入 HttpOnly session cookie，前端 JS 读不到，降低被 XSS 盗取的风险。”
- “后续所有高危动作的授权都走服务端校验，而不是靠前端按钮禁用。”

**可选补镜头（10 秒）**：
- 打开 DevTools → Application → Cookies，说明 cookie 是 HttpOnly。

---

## 2) Ops：创建一个 Run（~1:00）

**画面**：进入 `/ops`

**操作**：
1. 打开 `http://localhost:3000/ops`
2. 在「Create Run」里填写：
   - type：`ops.self_check`
   - reason：`demo for video`
3. 提交

**口播要点**：
- “Run 是一次可追踪的运维动作实例。我们要求 reason，是为了让审计里能解释‘为什么要做这件事’。”
- “哪怕 executor 还在 mock，Runs/Tasks 的闭环能帮助我们把‘动作’和‘结果’、‘审计’串起来。”

---

## 3) Tasks：列表与详情（~1:00）

**画面**：进入 `/tasks`，再点进 `/tasks/[id]`

**操作**：
1. 打开 `http://localhost:3000/tasks`
2. 找到刚创建的 run，点击进入详情页
3. 在详情页观察状态轮询（queued/running/succeeded）以及输出字段

**口播要点**：
- “这里展示的是‘追踪闭环’：你能看到输入、状态、结果、以及可能的 artifacts（例如 diagnostics bundle 路径）。”
- “我们不让动作在 UI 里‘一闪而过’，而是强制留下一条可查证的轨迹。”

---

## 4) Config Center：Preview diff → Apply → Rollback（~2:00）

**画面**：进入 `/config`

**操作（Apply）**：
1. 打开 `http://localhost:3000/config`
2. 在 Current 区块确认当前版本（`currentVersion`）
3. 在 Draft JSON 里做一个小改动（例如加一个开关字段）
4. 点击「Preview diff」
5. 强调：敏感字段会被 mask（展示“脱敏 diff”）
6. 点击「Apply」
7. 在 confirm gate 弹窗里确认（必要时补充 reason）

**操作（Rollback）**：
1. 在版本列表里选一个旧版本
2. 点击「Rollback」并通过 confirm gate

**口播要点**：
- “配置变更是典型高危操作：必须二次确认（confirm gate），并写入审计。”
- “Apply / Rollback 都会生成 run：可追踪、可审计、可回滚，减少‘谁改了什么’的扯皮成本。”
- “Safe Mode 开启时，这些有副作用的操作会被服务端硬拒绝。”

---

## 5) Security & Audit：筛选并关联到 Run（~1:00）

**画面**：进入 `/security`

**操作**：
1. 打开 `http://localhost:3000/security`
2. 在过滤器中输入：
   - Action：例如 `config.apply` 或 `runs.create`
   - Actor：例如 `local-admin`
3. 点击「Apply filters」
4. 点开一条资源是 run 的记录，跳转到 `/tasks/<run_id>`

**口播要点**：
- “审计视图是只读的：viewer+ 都能看。”
- “关键是把审计事件和 runs 串联，形成‘为什么做 → 做了什么 → 结果如何’的一条链。”

---

## 6) Memory Center：列表 / 搜索 / 详情（~1:00）

**画面**：进入 `/memory`，再点进 `/memory/[id]`

**操作**：
1. 打开 `http://localhost:3000/memory`
2. 在搜索框（占位符“搜索关键字”）输入一个词，点击「搜索」
3. 点击任意文件名进入详情页（Memory Detail）
4. 展示内容是脱敏后的（出现 `[REDACTED]`）

**口播要点**：
- “记忆是高敏资产，所以默认只读浏览/搜索，输出会做基础脱敏。”
- “清理/裁剪属于高危动作：需要 admin + confirm gate，并会被 Safe Mode 阻断（视频里可以只讲口径，不一定演示）。”

---

## 7) 结尾（~0:30）

**画面**：回到项目首页或 README

**口播要点**：
- “总结一下：ClawCare v0 把运维动作放进服务端护栏里，核心价值是默认安全 + 可审计 + 可回滚 + 可追踪闭环。”
- “下一步如果要接入真实 executor 或 Gateway，这套护栏与审计链路是底座。”

**屏幕提示（可加字幕）**：
- 使用指南：`docs/USAGE_GUIDE.md`
- 边界：`docs/BOUNDARIES_AND_GOTCHAS.md`
- 状态：`docs/STATUS.md`
