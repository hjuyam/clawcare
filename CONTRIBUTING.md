# Contributing to ClawCare

本指南面向参与 ClawCare 开发的贡献者，目标是：**迭代快、回归少、默认安全**。

---

## 开发流程（建议）

1. **创建 Issue / 设计说明（可轻量）**
   - 说明问题/目标、非目标、验收标准
   - 涉及安全/鉴权/外联能力时：补充风险点与护栏

2. **创建分支开发**（见下文分支策略）

3. **本地开发与自测**
   - `npm run dev`
   - `npm run lint`
   - `npm run test`
   - 必要时补充最小 API 合约/Mock 数据，保证 UI 可演进

4. **提交 PR**
   - 描述：背景、改动点、截图/录屏（如有 UI）、兼容性与风险
   - 必须标注：是否涉及高危动作（删除/写入/外发/鉴权）

5. **Review & Merge**
   - 至少 1 人 review（安全相关改动建议 2 人）

---

## 分支策略

采用简化 Git Flow：
- `main`：可随时发布/部署的稳定分支
- `feature/<topic>`：新功能
- `fix/<topic>`：缺陷修复
- `chore/<topic>`：工程化/依赖/重构

分支命名示例：
- `feature/bff-capabilities`
- `fix/self-check-validation`
- `chore/upgrade-next`

---

## 提交规范（Conventional Commits）

格式：
```text
<type>(<scope>): <subject>

<body>

<footer>
```

常用 `type`：
- `feat`：新增能力
- `fix`：修复 bug
- `docs`：文档
- `refactor`：重构（不改变外部行为）
- `test`：测试
- `chore`：工程化杂项

示例：
- `feat(api): add ops cleanup endpoint (dry-run by default)`
- `fix(ui): handle degraded self-check status`
- `docs: add api contract summary`

破坏性变更：
- 在 footer 添加 `BREAKING CHANGE:`

---

## 代码风格与约定

### TypeScript / Next.js
- 使用 TypeScript（严格类型优先）
- API 层（BFF）：优先用 **Zod** 做输入校验（见 `app/api/ops/_utils.ts` 的 `parseJsonBody`）

### 格式化与静态检查
- Prettier：`npm run format`
- ESLint：`npm run lint`

### API 设计约定（摘要）
- **不信任输入**：所有 body/query/path 参数都要校验
- **错误返回一致**：建议统一结构：
  ```json
  {"error": {"code": "...", "message": "...", "requestId": "..."}}
  ```
- **默认安全**：高危操作（写入/删除/外发）默认 dry-run，二次确认 + reason + 审计

更多见：`docs/api-contract.md`。
