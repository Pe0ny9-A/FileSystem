const logger = require('./logger');
const { readFileRecords } = require('./fileManager');

/**
 * 生成随机取件码
 * @param {number} length - 取件码长度，默认6位
 * @returns {string} 取件码
 */
function generatePickupCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * 生成唯一的取件码
 * @param {number} maxAttempts - 最大尝试次数
 * @returns {string} 唯一的取件码
 */
function generateUniquePickupCode(maxAttempts = 100) {
  const records = readFileRecords();
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const code = generatePickupCode();
    
    // 检查取件码是否已存在
    if (!records[code]) {
      logger.debug('生成唯一取件码', { code, attempts: attempts + 1 });
      return code;
    }
    
    attempts++;
  }
  
  // 如果达到最大尝试次数，抛出错误
  logger.error('生成唯一取件码失败', { maxAttempts });
  throw new Error('无法生成唯一取件码，请稍后重试');
}

/**
 * 验证取件码格式
 * @param {string} code - 取件码
 * @returns {boolean} 是否有效
 */
function validatePickupCode(code) {
  // 基本格式检查
  if (typeof code !== 'string') {
    return false;
  }
  
  // 长度检查
  const expectedLength = parseInt(process.env.PICKUP_CODE_LENGTH) || 6;
  if (code.length !== expectedLength) {
    return false;
  }
  
  // 字符检查 - 只允许大写字母和数字
  const pattern = new RegExp(`^[A-Z0-9]{${expectedLength}}$`);
  if (!pattern.test(code)) {
    return false;
  }
  
  // 安全检查 - 防止特殊字符注入
  const dangerousChars = ['<', '>', '"', "'", '&', ';', '(', ')', '|', '`'];
  if (dangerousChars.some(char => code.includes(char))) {
    return false;
  }
  
  return true;
}

/**
 * 检查取件码是否存在且有效
 * @param {string} code - 取件码
 * @returns {Object} 检查结果
 */
function checkPickupCodeValidity(code) {
  // 格式验证
  if (!validatePickupCode(code)) {
    return {
      valid: false,
      reason: 'INVALID_FORMAT',
      message: '取件码格式无效'
    };
  }
  
  const records = readFileRecords();
  const record = records[code];
  
  // 检查取件码是否存在
  if (!record) {
    return {
      valid: false,
      reason: 'NOT_FOUND',
      message: '取件码不存在'
    };
  }
  
  // 检查是否过期
  const now = Date.now();
  if (record.expiresAt && record.expiresAt < now) {
    return {
      valid: false,
      reason: 'EXPIRED',
      message: '取件码已过期',
      expiredAt: new Date(record.expiresAt)
    };
  }
  
  // 检查下载次数限制（可选功能）
  const maxDownloads = parseInt(process.env.MAX_DOWNLOADS_PER_CODE) || 0;
  if (maxDownloads > 0 && record.downloadCount >= maxDownloads) {
    return {
      valid: false,
      reason: 'DOWNLOAD_LIMIT_EXCEEDED',
      message: '下载次数已达上限'
    };
  }
  
  return {
    valid: true,
    record
  };
}

/**
 * 生成取件码统计信息
 * @returns {Object} 统计信息
 */
function getCodeStats() {
  const records = readFileRecords();
  const now = Date.now();
  
  let totalCodes = 0;
  let activeCodes = 0;
  let expiredCodes = 0;
  let downloadedCodes = 0;
  
  Object.values(records).forEach(record => {
    totalCodes++;
    
    if (record.expiresAt < now) {
      expiredCodes++;
    } else {
      activeCodes++;
    }
    
    if (record.downloadCount > 0) {
      downloadedCodes++;
    }
  });
  
  return {
    totalCodes,
    activeCodes,
    expiredCodes,
    downloadedCodes,
    usageRate: totalCodes > 0 ? (downloadedCodes / totalCodes * 100).toFixed(2) + '%' : '0%'
  };
}

/**
 * 清理过期的取件码
 * @returns {number} 清理的数量
 */
function cleanupExpiredCodes() {
  const records = readFileRecords();
  const now = Date.now();
  let cleanedCount = 0;
  
  const activeRecords = {};
  
  Object.entries(records).forEach(([code, record]) => {
    if (record.expiresAt && record.expiresAt > now) {
      // 保留未过期的记录
      activeRecords[code] = record;
    } else {
      // 记录清理的过期码
      cleanedCount++;
      logger.fileOperation('CLEANUP_EXPIRED_CODE', {
        pickupCode: code,
        filename: record.originalName,
        expiredAt: new Date(record.expiresAt)
      });
    }
  });
  
  // 只在有清理时才保存
  if (cleanedCount > 0) {
    const { saveFileRecords } = require('./fileManager');
    saveFileRecords(activeRecords);
    logger.info(`清理过期取件码: ${cleanedCount}个`);
  }
  
  return cleanedCount;
}

module.exports = {
  generatePickupCode,
  generateUniquePickupCode,
  validatePickupCode,
  checkPickupCodeValidity,
  getCodeStats,
  cleanupExpiredCodes
};
