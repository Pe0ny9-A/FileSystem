const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// 创建速率限制中间件
const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 默认限制
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    ...options
  };

  return rateLimit({
    ...defaultOptions,
    handler: (req, res) => {
      logger.security('RATE_LIMIT_EXCEEDED', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        limit: defaultOptions.max,
        windowMs: defaultOptions.windowMs
      });

      res.status(429).json({
        success: false,
        error: '请求过于频繁，请稍后再试',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.round(defaultOptions.windowMs / 1000)
      });
    },
    onLimitReached: (req, res, options) => {
      logger.warn('达到速率限制', {
        ip: req.ip,
        path: req.path,
        limit: options.max,
        windowMs: options.windowMs
      });
    }
  });
};

// 文件上传速率限制 - 更严格
const uploadLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 10, // 最多10次上传
  message: {
    success: false,
    error: '上传频率过快，请稍后再试',
    code: 'UPLOAD_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // 使用IP地址作为限制键
    return req.ip;
  },
  skip: (req) => {
    // 跳过健康检查等请求
    return req.path === '/health' || req.path === '/';
  }
});

// 取件码验证速率限制
const verifyLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5分钟
  max: 30, // 最多30次验证
  message: {
    success: false,
    error: '验证频率过快，请稍后再试',
    code: 'VERIFY_RATE_LIMIT'
  }
});

// 文件下载速率限制
const downloadLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10分钟
  max: 50, // 最多50次下载
  message: {
    success: false,
    error: '下载频率过快，请稍后再试',
    code: 'DOWNLOAD_RATE_LIMIT'
  }
});

// 通用API速率限制
const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 最多100次API调用
  message: {
    success: false,
    error: 'API调用频率过快，请稍后再试',
    code: 'API_RATE_LIMIT'
  }
});

// 严格的速率限制 - 用于敏感操作
const strictLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 5, // 最多5次
  message: {
    success: false,
    error: '操作过于频繁，请1小时后再试',
    code: 'STRICT_RATE_LIMIT'
  }
});

// 基于用户行为的动态限制
const adaptiveLimiter = (req, res, next) => {
  const userAgent = req.get('User-Agent') || '';
  const isBot = /bot|crawler|spider|scraper/i.test(userAgent);
  
  if (isBot) {
    // 对爬虫更严格的限制
    return createRateLimiter({
      windowMs: 60 * 60 * 1000, // 1小时
      max: 10,
      message: {
        success: false,
        error: '检测到自动化访问，请降低访问频率',
        code: 'BOT_RATE_LIMIT'
      }
    })(req, res, next);
  }
  
  // 正常用户使用标准限制
  return apiLimiter(req, res, next);
};

// IP白名单中间件（可选）
const createIPWhitelist = (whitelist = []) => {
  return (req, res, next) => {
    const clientIP = req.ip;
    
    if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
      logger.security('IP_NOT_WHITELISTED', {
        ip: clientIP,
        path: req.path
      });
      
      return res.status(403).json({
        success: false,
        error: '访问被拒绝',
        code: 'IP_NOT_ALLOWED'
      });
    }
    
    next();
  };
};

// 创建基于时间的动态限制
const createTimeBasedLimiter = (peakHours = [9, 10, 11, 14, 15, 16]) => {
  return (req, res, next) => {
    const hour = new Date().getHours();
    const isPeakHour = peakHours.includes(hour);
    
    const limiter = createRateLimiter({
      windowMs: 15 * 60 * 1000,
      max: isPeakHour ? 50 : 100, // 高峰期减少限制
      message: {
        success: false,
        error: isPeakHour ? '系统繁忙，请稍后再试' : 'API调用频率过快',
        code: 'TIME_BASED_RATE_LIMIT'
      }
    });
    
    return limiter(req, res, next);
  };
};

module.exports = {
  uploadLimiter,
  verifyLimiter,
  downloadLimiter,
  apiLimiter,
  strictLimiter,
  adaptiveLimiter,
  createRateLimiter,
  createIPWhitelist,
  createTimeBasedLimiter
};
