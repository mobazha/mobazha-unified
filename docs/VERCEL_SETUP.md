# Vercel 部署配置指南

## 费用说明

| 计划           | 价格     | 带宽     | 适用场景        |
| -------------- | -------- | -------- | --------------- |
| **Hobby**      | 免费     | 100GB/月 | 个人/非商业项目 |
| **Pro**        | $20/月   | 1TB/月   | 团队/商业项目   |
| **Enterprise** | 按需定价 | 无限制   | 大型企业        |

> 💡 开源项目可以申请 Vercel 开源计划，获得免费 Pro 功能

## 快速开始

### 方式一：直接连接 GitHub (推荐)

1. 访问 [vercel.com](https://vercel.com) 并登录
2. 点击 "Add New Project"
3. 导入 GitHub 仓库 `mobazha/mobazha-unified`
4. 配置项目：
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `cd ../.. && pnpm build`
   - **Output Directory**: `.next`

### 方式二：通过 GitHub Actions 部署

需要配置以下 GitHub Secrets:

```
VERCEL_TOKEN      - Vercel 个人访问令牌
VERCEL_ORG_ID     - Vercel 组织/团队 ID
VERCEL_PROJECT_ID - Vercel 项目 ID
```

#### 获取 Secrets

1. **VERCEL_TOKEN**
   - 访问 https://vercel.com/account/tokens
   - 点击 "Create" 创建新令牌
   - 复制令牌值

2. **VERCEL_ORG_ID 和 VERCEL_PROJECT_ID**
   - 在项目根目录运行：
     ```bash
     npx vercel link
     ```
   - 查看生成的 `.vercel/project.json` 文件：
     ```json
     {
       "orgId": "team_xxxxx", // VERCEL_ORG_ID
       "projectId": "prj_xxxxx" // VERCEL_PROJECT_ID
     }
     ```

3. **添加到 GitHub Secrets**
   - 访问仓库 Settings → Secrets and variables → Actions
   - 添加上述三个 secrets

## 环境变量配置

在 Vercel 项目设置中添加以下环境变量：

| 变量名                          | 说明                  | 示例值                       |
| ------------------------------- | --------------------- | ---------------------------- |
| `NEXT_PUBLIC_API_URL`           | Mobazha 节点 API 地址 | `https://api.mobazha.com`    |
| `NEXT_PUBLIC_MATRIX_HOMESERVER` | Matrix 服务器地址     | `https://matrix.mobazha.com` |
| `NEXT_PUBLIC_USE_MOCK_DATA`     | 是否使用 Mock 数据    | `false`                      |

## 部署流程

### 自动部署 (推荐)

每次推送到 `main` 分支后：

1. CI workflow 运行测试和构建
2. CI 成功后，Deploy workflow 自动触发
3. 自动部署到 Staging 环境

### 手动部署

```bash
# 本地部署预览
npx vercel

# 部署到生产环境
npx vercel --prod
```

或者在 GitHub Actions 中手动触发 Deploy workflow。

## 项目结构配置

`apps/web/vercel.json`:

```json
{
  "framework": "nextjs",
  "installCommand": "cd ../.. && pnpm install",
  "buildCommand": "cd ../.. && pnpm build",
  "outputDirectory": ".next",
  "regions": ["hkg1", "sin1"]
}
```

## 常见问题

### Q: Monorepo 项目如何配置？

A: 在 Vercel 项目设置中：

- Root Directory: `apps/web`
- 勾选 "Include source files outside of the Root Directory"

### Q: 构建失败怎么办？

A: 检查以下几点：

1. 确保 `pnpm-lock.yaml` 已提交
2. 确认环境变量已正确配置
3. 查看构建日志中的具体错误

### Q: 如何配置自定义域名？

A: 在 Vercel 项目 Settings → Domains 中添加域名，并配置 DNS 记录。

## 相关链接

- [Vercel 文档](https://vercel.com/docs)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)
- [Vercel CLI](https://vercel.com/docs/cli)
