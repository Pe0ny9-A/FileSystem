const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// 允许的文件类型
const allowedMimeTypes = [
  // 图片类型
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  
  // 文档类型
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  
  // 压缩文件
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  
  // 其他常用类型
  'application/json',
  'text/csv'
];

// 危险文件扩展名黑名单
const dangerousExtensions = [
  '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
  '.php', '.asp', '.aspx', '.jsp', '.py', '.rb', '.pl', '.sh', '.bash'
];

// 存储配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳-UUID-原文件名
    const timestamp = Date.now();
    const uuid = uuidv4().substring(0, 8);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_') // 替换特殊字符
      .substring(0, 50); // 限制文件名长度
    
    const uniqueName = `${timestamp}-${uuid}-${baseName}${ext}`;
    cb(null, uniqueName);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const startTime = Date.now();
  
  try {
    // 检查MIME类型
    if (!allowedMimeTypes.includes(file.mimetype)) {
      logger.security('INVALID_MIME_TYPE', {
        mimetype: file.mimetype,
        originalname: file.originalname,
        ip: req.ip
      });
      return cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
    }
    
    // 检查文件扩展名
    const ext = path.extname(file.originalname).toLowerCase();
    if (dangerousExtensions.includes(ext)) {
      logger.security('DANGEROUS_EXTENSION', {
        extension: ext,
        originalname: file.originalname,
        ip: req.ip
      });
      return cb(new Error(`危险的文件类型: ${ext}`), false);
    }
    
    // 检查文件名长度
    if (file.originalname.length > 255) {
      return cb(new Error('文件名过长（最大255字符）'), false);
    }
    
    // 检查文件名中的特殊字符
    const dangerousChars = ['<', '>', '"', '|', '?', '*', ':', '\\', '/'];
    if (dangerousChars.some(char => file.originalname.includes(char))) {
      logger.security('DANGEROUS_FILENAME', {
        originalname: file.originalname,
        ip: req.ip
      });
      return cb(new Error('文件名包含非法字符'), false);
    }
    
    logger.performance('FILE_FILTER', Date.now() - startTime);
    cb(null, true);
    
  } catch (error) {
    logger.error('文件过滤器错误:', error);
    cb(error, false);
  }
};

// Multer配置
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
    files: 1, // 只允许单文件上传
    fields: 10, // 限制表单字段数量
    fieldNameSize: 100, // 字段名长度限制
    fieldSize: 1024 * 1024 // 字段值大小限制 1MB
  }
});

// 上传中间件包装器
const uploadMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  upload.single('file')(req, res, (err) => {
    if (err) {
      // 记录上传错误
      logger.error('文件上传错误:', {
        error: err.message,
        code: err.code,
        field: err.field,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // 根据错误类型返回相应的错误信息
      if (err instanceof multer.MulterError) {
        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            return res.status(413).json({
              success: false,
              error: '文件大小超出限制（最大50MB）',
              code: 'FILE_TOO_LARGE'
            });
          case 'LIMIT_FILE_COUNT':
            return res.status(400).json({
              success: false,
              error: '文件数量超出限制',
              code: 'TOO_MANY_FILES'
            });
          case 'LIMIT_UNEXPECTED_FILE':
            return res.status(400).json({
              success: false,
              error: '意外的文件字段',
              code: 'UNEXPECTED_FIELD'
            });
          default:
            return res.status(400).json({
              success: false,
              error: '文件上传失败',
              code: 'UPLOAD_ERROR'
            });
        }
      }
      
      // 自定义错误
      return res.status(400).json({
        success: false,
        error: err.message,
        code: 'VALIDATION_ERROR'
      });
    }
    
    // 记录上传性能
    logger.performance('FILE_UPLOAD_MIDDLEWARE', Date.now() - startTime);
    
    // 记录成功的上传请求
    if (req.file) {
      logger.fileOperation('UPLOAD_REQUEST', {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        ip: req.ip
      });
    }
    
    next();
  });
};

// 文件验证中间件
const validateFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: '没有上传文件',
      code: 'NO_FILE'
    });
  }
  
  // 额外的文件验证可以在这里添加
  // 例如：病毒扫描、内容验证等
  
  next();
};

module.exports = {
  uploadMiddleware,
  validateFile,
  allowedMimeTypes,
  dangerousExtensions
};
