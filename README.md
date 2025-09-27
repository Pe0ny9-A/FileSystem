# 🌟 FileSystem - 3D文件共享系统

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Vue.js Version](https://img.shields.io/badge/vue-%3E%3D3.4.0-brightgreen.svg)](https://vuejs.org/)

一个现代化的文件共享系统，采用取件码机制，无需登录即可实现文件的上传和下载，配备炫酷的3D界面和二维码功能。

[English](README_EN.md) | 中文

## ✨ 功能特色

- 🎯 **简单易用** - A上传文件获得取件码，B通过取件码下载文件
- 🎨 **3D视觉** - 基于Three.js的现代化3D交互界面
- 📱 **二维码支持** - 自动生成取件二维码，支持移动端扫码
- 🔒 **安全可靠** - 文件自动过期，支持多种文件类型验证
- 📱 **响应式设计** - 完美支持桌面端和移动端
- ⚡ **高性能** - 优化的3D渲染和文件处理性能
- 🐳 **容器化部署** - 支持Docker一键部署

## 🚀 技术栈

### 前端
- **Vue 3.4+** - 现代化前端框架
- **TypeScript** - 类型安全
- **Three.js** - 3D图形渲染
- **Vite** - 快速构建工具
- **Pinia** - 状态管理
- **Tailwind CSS** - 原子化样式
- **GSAP** - 高性能动画

### 后端
- **Node.js 18+** - 服务端运行时
- **Express.js** - Web框架
- **Multer** - 文件上传处理
- **Winston** - 日志管理

## 📁 项目结构

```
company-file-system/
├── frontend/          # Vue3前端应用
├── backend/           # Node.js后端API
├── docs/             # 项目文档
├── .cursor/          # Cursor开发规则
└── README.md         # 项目说明
```

## 🛠️ 开发环境

### 系统要求
- Node.js 18+
- npm 或 yarn
- 现代浏览器（支持WebGL）

### 安装依赖
```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 启动开发服务器
```bash
# 启动后端服务 (端口3000)
cd backend
npm run dev

# 启动前端服务 (端口5173)
cd ../frontend
npm run dev
```

## 📖 使用说明

### 文件上传流程
1. 访问上传页面
2. 拖拽文件到3D容器或点击选择文件
3. 系统生成6位取件码
4. 将取件码分享给需要下载的人员

### 文件下载流程
1. 访问取件页面
2. 输入6位取件码
3. 系统验证取件码有效性
4. 点击下载按钮获取文件

## 🔧 配置说明

### 环境变量
```bash
# 后端配置
PORT=3000
MAX_FILE_SIZE=52428800  # 50MB
UPLOAD_DIR=./uploads
LOG_LEVEL=info

# 前端配置
VITE_API_URL=http://localhost:3000
```

## 🚀 部署

### 使用Docker
```bash
docker-compose up -d
```

### 手动部署
```bash
# 构建前端
cd frontend
npm run build

# 启动后端
cd ../backend
npm start
```

## 📊 性能指标

- 首屏加载时间 < 3秒
- 3D场景初始化 < 2秒
- API响应时间 < 500ms
- 支持并发用户 > 100

## 🔐 安全特性

- 文件类型白名单验证
- 文件大小限制（50MB）
- 取件码自动过期（7天）
- 请求频率限制
- 恶意文件检测

## 🤝 贡献

我们欢迎所有形式的贡献！请查看 [贡献指南](CONTRIBUTING.md) 了解如何参与项目。

### 贡献者

感谢所有为项目做出贡献的开发者！

<a href="https://github.com/pe0ny9-a/FileSystem/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=pe0ny9-a/FileSystem" />
</a>

## 🐛 问题反馈

如果您发现了 bug 或有功能建议，请通过以下方式联系我们：

- [GitHub Issues](https://github.com/pe0ny9-a/FileSystem/issues)
- [讨论区](https://github.com/pe0ny9-a/FileSystem/discussions)

## 🔒 安全

请查看我们的 [安全政策](SECURITY.md) 了解如何报告安全漏洞。

## 📝 更新日志

### v1.0.0 (2025-09-27)
- ✅ 完整的文件上传下载功能
- ✅ 3D交互界面实现
- ✅ 二维码生成和扫描
- ✅ Docker容器化部署
- ✅ 完善的安全机制

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) - 查看 LICENSE 文件了解详情。

## ⭐ Star History

[![Star History Chart](https://api.star-history.com/svg?repos=pe0ny9-a/FileSystem&type=Date)](https://star-history.com/#pe0ny9-a/FileSystem&Date)

## 📞 联系我们

- 项目主页：https://github.com/pe0ny9-a/FileSystem
- 邮箱：pikachu237325@163.com

---

如果这个项目对您有帮助，请给我们一个 ⭐ Star！

---

💡 **提示**: 这是一个现代化的文件管理系统，结合了实用性和视觉震撼力，为企业文件共享提供全新体验！
