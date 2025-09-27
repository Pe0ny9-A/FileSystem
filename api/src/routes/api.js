const express = require('express');
const fileController = require('../controllers/fileController');
const qrController = require('../controllers/qrController');
const { uploadMiddleware, validateFile } = require('../middleware/upload');
const { uploadLimiter, verifyLimiter, downloadLimiter, apiLimiter } = require('../middleware/rateLimit');
const { validateUpload, validateHeaders } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// 应用通用中间件
router.use(validateHeaders);
router.use(apiLimiter);

// 请求日志中间件
router.use((req, res, next) => {
  const startTime = Date.now();
  
  // 记录请求开始
  logger.info('API请求', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length')
  });
  
  // 监听响应结束
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('API响应', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
    
    // 记录性能指标
    logger.performance('API_REQUEST', duration);
  });
  
  next();
});

// 文件上传路由
router.post('/files/upload', 
  uploadLimiter,
  uploadMiddleware,
  validateFile,
  validateUpload,
  fileController.uploadFile
);

// 取件码验证路由
router.get('/files/verify/:code', 
  verifyLimiter,
  (req, res, next) => {
    // 验证取件码格式
    const { code } = req.params;
    if (!code || !/^[A-Z0-9]{6}$/i.test(code)) {
      return res.status(400).json({
        success: false,
        error: '取件码格式无效',
        code: 'INVALID_CODE_FORMAT'
      });
    }
    next();
  },
  fileController.verifyPickupCode
);

// 文件下载路由
router.get('/files/download/:code', 
  downloadLimiter,
  (req, res, next) => {
    // 验证取件码格式
    const { code } = req.params;
    if (!code || !/^[A-Z0-9]{6}$/i.test(code)) {
      return res.status(400).json({
        success: false,
        error: '取件码格式无效',
        code: 'INVALID_CODE_FORMAT'
      });
    }
    next();
  },
  fileController.downloadFile
);

// 获取文件信息路由（不下载）
router.get('/files/info/:code', 
  verifyLimiter,
  (req, res, next) => {
    const { code } = req.params;
    if (!code || !/^[A-Z0-9]{6}$/i.test(code)) {
      return res.status(400).json({
        success: false,
        error: '取件码格式无效',
        code: 'INVALID_CODE_FORMAT'
      });
    }
    next();
  },
  fileController.getFileInfo
);

// 系统统计路由
router.get('/system/stats', 
  fileController.getStatistics
);

// 系统状态路由
router.get('/system/status', (req, res) => {
  const uptime = process.uptime();
  const memory = process.memoryUsage();
  
  res.json({
    success: true,
    data: {
      status: 'running',
      uptime: {
        seconds: Math.floor(uptime),
        formatted: formatUptime(uptime)
      },
      memory: {
        used: Math.round(memory.heapUsed / 1024 / 1024),
        total: Math.round(memory.heapTotal / 1024 / 1024),
        usage: Math.round((memory.heapUsed / memory.heapTotal) * 100)
      },
      environment: process.env.NODE_ENV || 'development',
      version: require('../../package.json').version,
      timestamp: new Date().toISOString()
    }
  });
});

// 二维码相关路由
router.get('/qr/generate/:code', 
  verifyLimiter,
  (req, res, next) => {
    // 验证取件码格式
    const { code } = req.params;
    if (!code || !/^[A-Z0-9]{6}$/i.test(code)) {
      return res.status(400).json({
        success: false,
        error: '取件码格式无效',
        code: 'INVALID_CODE_FORMAT'
      });
    }
    next();
  },
  qrController.generatePickupQR
);

// 批量生成二维码
router.post('/qr/batch', 
  uploadLimiter, // 使用上传限制器
  qrController.generateBatchQR
);

// 二维码统计
router.get('/qr/stats', 
  qrController.getQRStats
);

// 管理员路由（需要认证，这里简化处理）
router.delete('/admin/files/:code', 
  // TODO: 添加管理员认证中间件
  (req, res, next) => {
    // 简单的管理员验证（生产环境应该使用更安全的方法）
    const adminKey = req.get('X-Admin-Key');
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({
        success: false,
        error: '无权限访问',
        code: 'UNAUTHORIZED'
      });
    }
    next();
  },
  fileController.deleteFile
);

// API文档路由
router.get('/docs', (req, res) => {
  res.json({
    name: '公司文件管理系统 API',
    version: require('../../package.json').version,
    description: '基于取件码的文件共享系统API接口',
    endpoints: {
      upload: {
        method: 'POST',
        path: '/api/files/upload',
        description: '上传文件并获取取件码',
        parameters: {
          file: 'File (required) - 要上传的文件',
          description: 'String (optional) - 文件描述',
          tags: 'String (optional) - 文件标签',
          expiryDays: 'Number (optional) - 过期天数，默认7天'
        },
        limits: {
          fileSize: '50MB',
          rateLimit: '10 requests per 15 minutes'
        }
      },
      verify: {
        method: 'GET',
        path: '/api/files/verify/:code',
        description: '验证取件码并获取文件信息',
        parameters: {
          code: 'String (required) - 6位取件码'
        },
        limits: {
          rateLimit: '30 requests per 5 minutes'
        }
      },
      download: {
        method: 'GET',
        path: '/api/files/download/:code',
        description: '通过取件码下载文件',
        parameters: {
          code: 'String (required) - 6位取件码'
        },
        limits: {
          rateLimit: '50 requests per 10 minutes'
        }
      },
      info: {
        method: 'GET',
        path: '/api/files/info/:code',
        description: '获取文件信息（不触发下载）',
        parameters: {
          code: 'String (required) - 6位取件码'
        }
      },
      stats: {
        method: 'GET',
        path: '/api/system/stats',
        description: '获取系统统计信息'
      },
      status: {
        method: 'GET',
        path: '/api/system/status',
        description: '获取系统运行状态'
      },
      qrGenerate: {
        method: 'GET',
        path: '/api/qr/generate/:code',
        description: '生成取件码二维码',
        parameters: {
          code: 'String (required) - 6位取件码',
          format: 'String (optional) - 格式：png|svg，默认png',
          size: 'Number (optional) - 尺寸，默认200',
          margin: 'Number (optional) - 边距，默认4',
          download: 'Boolean (optional) - 是否下载，默认false'
        }
      },
      qrBatch: {
        method: 'POST',
        path: '/api/qr/batch',
        description: '批量生成二维码',
        parameters: {
          codes: 'Array (required) - 取件码数组，最多10个',
          format: 'String (optional) - 格式：png|svg',
          size: 'Number (optional) - 尺寸'
        }
      },
      qrStats: {
        method: 'GET',
        path: '/api/qr/stats',
        description: '获取二维码生成统计'
      }
    },
    errorCodes: {
      'NO_FILE': '没有上传文件',
      'INVALID_CODE_FORMAT': '取件码格式无效',
      'NOT_FOUND': '取件码不存在',
      'EXPIRED': '取件码已过期',
      'FILE_NOT_FOUND': '文件不存在',
      'RATE_LIMIT_EXCEEDED': '请求频率过快',
      'VALIDATION_ERROR': '数据验证失败',
      'UPLOAD_FAILED': '文件上传失败',
      'DOWNLOAD_FAILED': '文件下载失败'
    },
    examples: {
      uploadResponse: {
        success: true,
        message: '文件上传成功',
        data: {
          pickupCode: 'ABC123',
          originalName: 'document.pdf',
          size: 1024000,
          formattedSize: '1000.00 KB',
          mimetype: 'application/pdf',
          expiresAt: 1640995200000,
          expiresIn: '7天0小时'
        }
      },
      verifyResponse: {
        success: true,
        message: '取件码验证成功',
        data: {
          name: 'document.pdf',
          size: 1024000,
          formattedSize: '1000.00 KB',
          mimetype: 'application/pdf',
          uploadTime: 1640908800000,
          expiresAt: 1640995200000,
          timeRemaining: '6天23小时',
          downloadCount: 0,
          description: '重要文档',
          tags: 'pdf,document'
        }
      }
    }
  });
});

// 404处理
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API接口不存在',
    code: 'NOT_FOUND',
    path: req.originalUrl,
    availableEndpoints: [
      'POST /api/files/upload',
      'GET /api/files/verify/:code',
      'GET /api/files/download/:code',
      'GET /api/files/info/:code',
      'GET /api/system/stats',
      'GET /api/system/status',
      'GET /api/docs'
    ]
  });
});

// 辅助函数：格式化运行时间
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  let result = '';
  if (days > 0) result += `${days}天 `;
  if (hours > 0) result += `${hours}小时 `;
  if (minutes > 0) result += `${minutes}分钟 `;
  result += `${secs}秒`;
  
  return result.trim();
}

module.exports = router;
