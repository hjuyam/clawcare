# ClawCare（龙虾管家）— M1 功能说明

> 版本基线：`main` 分支（包含 commit `feat(m1): auth + rbac + safe mode + tests + acceptance docs` 及后续文档提交）

生成时间（UTC）：2026-03-12

## 1. 产品定位（M1）
ClawCare 是一个面向 OpenClaw/运维场景的“带强安全约束的运维控制台雏形”。M1 优先解决“谁能做什么”“什么时候必须拒绝”“拒绝要可审计”这三件事。

## 2. 登录与会话（Auth/Session）
- 提供登录页面：`/login`
- 提供 API：
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
- 目标：让后续所有高危能力都必须在“可识别身份 + 可追踪会话”的前提下执行。

## 3. 角色与权限（RBAC）
M1 的 RBAC 为最小可用：
- 角色：`admin` / `viewer`
- 基础规则：
  - `viewer` 只能查看，不得触发高危操作
  - `admin` 在非 Safe Mode 时可以触发高危操作

> 说明：这里的“高危操作”指会改变系统状态、具有破坏性或需要运维权限的动作（例如重启服务、清理、打包诊断信息等）。

## 4. Safe Mode（安全模式）
- 支持 Safe Mode 开关（配置能力）
- Safe Mode 规则：
  - 即使 `admin` 也会被阻断高危操作
  - 只允许低风险的只读/自检类能力

目的：在故障/异常/审计期，将系统降级到“可观测、不可更改”。

## 5. Policy deny + 审计（Audit）
M1 的设计目标不是“悄悄失败”，而是“明确拒绝 + 可追踪”。
- 当策略拒绝发生（未登录、权限不足、Safe Mode 等）时：
  - 返回明确的拒绝结果（deny）
  - 尽可能产生可用于审计的记录（best-effort）

## 6. Ops / Config / Security 的最小界面壳
- Home 能展示 capabilities（mock gateway 场景）
- Ops：具备自检/重启/清理/诊断包等最小 API 骨架（并纳入策略约束）
- Config：包含 Safe Mode 的最小接口与页面占位
- Security：包含审计相关页面占位，用于后续拓展

## 7. 测试与验收
- 单测：Vitest（12 tests）
- E2E：Playwright（8 tests）
- 详见：`docs/TEST_REPORT_M1.md`

## 8. 运行方式（开发/生产）
- 开发：`npm run dev`
- 构建：`npm run build`
- 启动：`npm run start`

