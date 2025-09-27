const Joi = require('joi');
const logger = require('../utils/logger');

// 通用验证中间件生成器
const createValidator = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false, // 返回所有验证错误
      stripUnknown: true // 移除未知字段
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.security('VALIDATION_ERROR', {
        source,
        errors,
        ip: req.ip,
        path: req.path
      });

      return res.status(400).json({
        success: false,
        error: '数据验证失败',
        code: 'VALIDATION_ERROR',
        details: errors
      });
    }

    // 将验证后的数据替换原数据
    req[source] = value;
    next();
  };
};

// 文件上传验证Schema
const uploadSchema = Joi.object({
  description: Joi.string()
    .max(500)
    .trim()
    .optional()
    .description('文件描述'),
  
  tags: Joi.string()
    .max(200)
    .trim()
    .optional()
    .description('文件标签'),
    
  expiryDays: Joi.number()
    .integer()
    .min(1)
    .max(30)
    .default(7)
    .optional()
    .description('过期天数')
});

// 取件码验证Schema
const pickupCodeSchema = Joi.object({
  code: Joi.string()
    .length(6)
    .pattern(/^[A-Z0-9]{6}$/)
    .required()
    .description('6位取件码')
    .messages({
      'string.length': '取件码必须是6位',
      'string.pattern.base': '取件码只能包含大写字母和数字',
      'any.required': '取件码不能为空'
    })
});

// 查询参数验证Schema
const querySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),
    
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .optional(),
    
  sort: Joi.string()
    .valid('uploadTime', 'size', 'name', 'expiresAt')
    .default('uploadTime')
    .optional(),
    
  order: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .optional()
});

// 自定义验证函数
const customValidators = {
  // 验证文件名安全性
  isFilenameSafe: (filename) => {
    if (!filename || typeof filename !== 'string') {
      return false;
    }
    
    // 检查文件名长度
    if (filename.length > 255) {
      return false;
    }
    
    // 检查危险字符
    const dangerousChars = ['<', '>', '"', '|', '?', '*', ':', '\\', '/', '\0'];
    if (dangerousChars.some(char => filename.includes(char))) {
      return false;
    }
    
    // 检查相对路径
    if (filename.includes('..') || filename.startsWith('.')) {
      return false;
    }
    
    return true;
  },

  // 验证IP地址格式
  isValidIP: (ip) => {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  },

  // 验证取件码强度
  isStrongPickupCode: (code) => {
    if (!code || typeof code !== 'string' || code.length !== 6) {
      return false;
    }
    
    // 检查是否包含字母和数字
    const hasLetter = /[A-Z]/.test(code);
    const hasNumber = /[0-9]/.test(code);
    
    // 检查是否有重复字符（连续3个相同字符视为弱密码）
    const hasRepeating = /(.)\1{2,}/.test(code);
    
    return hasLetter && hasNumber && !hasRepeating;
  }
};

// 请求头验证中间件
const validateHeaders = (req, res, next) => {
  const userAgent = req.get('User-Agent');
  const contentType = req.get('Content-Type');
  
  // 检查User-Agent
  if (!userAgent) {
    logger.security('MISSING_USER_AGENT', {
      ip: req.ip,
      path: req.path
    });
  }
  
  // 检查可疑的User-Agent
  const suspiciousPatterns = [
    /curl/i,
    /wget/i,
    /python/i,
    /bot/i,
    /crawler/i,
    /scraper/i
  ];
  
  if (userAgent && suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    logger.security('SUSPICIOUS_USER_AGENT', {
      userAgent,
      ip: req.ip,
      path: req.path
    });
  }
  
  // 对于POST请求，检查Content-Type
  if (req.method === 'POST' && !contentType) {
    return res.status(400).json({
      success: false,
      error: '缺少Content-Type头',
      code: 'MISSING_CONTENT_TYPE'
    });
  }
  
  next();
};

// 文件类型验证中间件
const validateFileType = (allowedTypes = []) => {
  return (req, res, next) => {
    if (!req.file) {
      return next();
    }
    
    const { mimetype, originalname } = req.file;
    
    // 如果指定了允许的类型，进行检查
    if (allowedTypes.length > 0 && !allowedTypes.includes(mimetype)) {
      logger.security('INVALID_FILE_TYPE', {
        mimetype,
        originalname,
        allowedTypes,
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        error: `不支持的文件类型: ${mimetype}`,
        code: 'INVALID_FILE_TYPE',
        allowedTypes
      });
    }
    
    next();
  };
};

// 请求大小验证中间件
const validateRequestSize = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        logger.security('REQUEST_TOO_LARGE', {
          contentLength: sizeInBytes,
          maxSize: maxSizeInBytes,
          ip: req.ip
        });
        
        return res.status(413).json({
          success: false,
          error: '请求体过大',
          code: 'REQUEST_TOO_LARGE'
        });
      }
    }
    
    next();
  };
};

// 辅助函数：解析大小字符串
function parseSize(sizeStr) {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) return 0;
  
  const size = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return size * units[unit];
}

// 导出验证中间件
const validateUpload = createValidator(uploadSchema, 'body');
const validatePickupCode = createValidator(pickupCodeSchema, 'params');
const validateQuery = createValidator(querySchema, 'query');

module.exports = {
  createValidator,
  validateUpload,
  validatePickupCode,
  validateQuery,
  validateHeaders,
  validateFileType,
  validateRequestSize,
  customValidators,
  uploadSchema,
  pickupCodeSchema,
  querySchema
};
