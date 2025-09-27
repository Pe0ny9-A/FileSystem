const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const logger = require('./src/utils/logger');
const apiRoutes = require('./src/routes/api');
const { createDirectories } = require('./src/utils/fileManager');
const { startCleanupService } = require('./src/services/cleanupService');

const app = express();
const PORT = process.env.PORT || 3000;

// 确保必要目录存在
createDirectories();

// 中间件配置
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(compression());
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 静态文件服务（可选，用于开发）
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// API路由
app.use('/api', apiRoutes);

// 健康检查接口
app.get('/health', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: require('./package.json').version,
    memory: process.memoryUsage(),
    pid: process.pid
  };
  
  res.status(200).json(healthCheck);
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    name: '公司文件管理系统 API',
    version: require('./package.json').version,
    description: '基于取件码的文件共享系统',
    endpoints: {
      upload: 'POST /api/files/upload',
      verify: 'GET /api/files/verify/:code',
      download: 'GET /api/files/download/:code',
      health: 'GET /health'
    }
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    path: req.originalUrl
  });
});

// 全局错误处理中间件
app.use((error, req, res, next) => {
  logger.error('API错误:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // 根据错误类型返回不同响应
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: '文件大小超出限制（最大50MB）'
    });
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      error: '文件数量超出限制'
    });
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: '意外的文件字段'
    });
  }
  
  // 默认服务器错误
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? '服务器内部错误' : error.message
  });
});

// 启动服务器
const server = app.listen(PORT, () => {
  logger.info(`🚀 文件管理系统后端服务启动成功`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    pid: process.pid
  });
  
  // 启动清理服务
  startCleanupService();
  
  logger.info('✅ 系统初始化完成');
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，开始优雅关闭...');
  server.close(() => {
    logger.info('HTTP服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，开始优雅关闭...');
  server.close(() => {
    logger.info('HTTP服务器已关闭');
    process.exit(0);
  });
});

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', { reason, promise });
  process.exit(1);
});

module.exports = app;
