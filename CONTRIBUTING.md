# 贡献指南 / Contributing Guide

感谢您对 FileSystem 项目的关注！我们欢迎所有形式的贡献。

## 🤝 如何贡献

### 报告问题 (Bug Reports)
- 使用 GitHub Issues 报告 bug
- 请提供详细的重现步骤
- 包含您的环境信息（操作系统、Node.js 版本等）

### 功能请求 (Feature Requests)
- 在 Issues 中描述您希望添加的功能
- 解释为什么这个功能对项目有用
- 如果可能，提供实现建议

### 代码贡献 (Code Contributions)

#### 开发环境设置
1. Fork 这个仓库
2. 克隆到本地：
   ```bash
   git clone https://github.com/pe0ny9-a/FileSystem.git
   cd FileSystem
   ```

3. 安装依赖：
   ```bash
   # 后端依赖
   cd backend
   npm install
   
   # 前端依赖
   cd ../frontend
   npm install
   ```

4. 创建功能分支：
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### 开发流程
1. 在 `backend` 目录下启动后端服务：
   ```bash
   npm run dev
   ```

2. 在 `frontend` 目录下启动前端服务：
   ```bash
   npm run dev
   ```

3. 进行您的更改
4. 运行测试（如果有）
5. 提交更改：
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

6. 推送到您的 fork：
   ```bash
   git push origin feature/your-feature-name
   ```

7. 创建 Pull Request

#### 代码规范
- 使用 ESLint 和 Prettier 保持代码风格一致
- 为新功能添加适当的注释
- 遵循现有的命名约定
- 确保代码通过所有检查

#### 提交信息规范
使用 [Conventional Commits](https://conventionalcommits.org/) 格式：

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式修改
- `refactor:` 代码重构
- `test:` 添加测试
- `chore:` 构建过程或辅助工具的变动

### 文档贡献
- 改进现有文档
- 添加使用示例
- 翻译文档到其他语言

## 📋 开发指南

### 项目结构
```
FileSystem/
├── backend/          # Node.js 后端
├── frontend/         # Vue 3 前端
├── docs/            # 文档
├── docker-compose.yml
└── README.md
```

### 技术栈
- **后端**: Node.js, Express.js, Winston
- **前端**: Vue 3, TypeScript, Three.js, GSAP
- **构建工具**: Vite, Docker
- **样式**: Tailwind CSS, Element Plus

### 测试
- 运行后端测试：`cd backend && npm test`
- 运行前端测试：`cd frontend && npm test`

## 🎯 优先级功能

当前我们特别欢迎以下方面的贡献：

1. **安全性改进**
   - 文件类型验证增强
   - 安全漏洞修复

2. **性能优化**
   - 大文件上传优化
   - 3D 渲染性能提升

3. **用户体验**
   - 移动端适配改进
   - 无障碍访问支持

4. **国际化**
   - 多语言支持
   - 本地化改进

## 📞 联系方式

如有疑问，请通过以下方式联系：
- GitHub Issues
- 项目讨论区
- pikachu237325@163.com

感谢您的贡献！🙏
