const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { 
  saveFileRecord, 
  getFileRecord, 
  deleteFileRecord, 
  deletePhysicalFile,
  fileExists,
  formatFileSize 
} = require('../utils/fileManager');
const { generateUniquePickupCode } = require('../utils/codeGenerator');

class FileService {
  /**
   * 处理文件上传
   * @param {Object} fileInfo - 上传的文件信息
   * @param {Object} metadata - 额外的元数据
   * @returns {Object} 处理结果
   */
  async processUpload(fileInfo, metadata = {}) {
    const startTime = Date.now();
    
    try {
      // 生成唯一取件码
      const pickupCode = generateUniquePickupCode();
      
      // 准备文件记录
      const fileRecord = {
        originalName: fileInfo.originalname,
        filename: fileInfo.filename,
        size: fileInfo.size,
        mimetype: fileInfo.mimetype,
        pickupCode,
        description: metadata.description || '',
        tags: metadata.tags || '',
        uploadTime: Date.now(),
        expiresAt: Date.now() + ((metadata.expiryDays || 7) * 24 * 60 * 60 * 1000),
        downloadCount: 0,
        lastDownloadTime: null,
        ipAddress: metadata.ipAddress || 'unknown',
        userAgent: metadata.userAgent || 'unknown'
      };
      
      // 保存文件记录
      saveFileRecord(pickupCode, fileRecord);
      
      // 记录上传成功
      logger.fileOperation('UPLOAD_SUCCESS', {
        pickupCode,
        originalName: fileInfo.originalname,
        filename: fileInfo.filename,
        size: fileInfo.size,
        formattedSize: formatFileSize(fileInfo.size),
        mimetype: fileInfo.mimetype,
        expiresAt: new Date(fileRecord.expiresAt),
        processingTime: Date.now() - startTime
      });
      
      // 返回结果（不包含敏感信息）
      return {
        success: true,
        pickupCode,
        originalName: fileInfo.originalname,
        size: fileInfo.size,
        formattedSize: formatFileSize(fileInfo.size),
        mimetype: fileInfo.mimetype,
        expiresAt: fileRecord.expiresAt,
        expiresIn: this.formatTimeRemaining(fileRecord.expiresAt - Date.now())
      };
      
    } catch (error) {
      // 如果保存记录失败，删除已上传的文件
      if (fileInfo.filename) {
        this.cleanupFailedUpload(fileInfo.filename);
      }
      
      logger.error('文件上传处理失败:', {
        error: error.message,
        filename: fileInfo.filename,
        originalname: fileInfo.originalname,
        processingTime: Date.now() - startTime
      });
      
      throw error;
    }
  }
  
  /**
   * 验证取件码并获取文件信息
   * @param {string} pickupCode - 取件码
   * @returns {Object} 验证结果
   */
  async verifyPickupCode(pickupCode) {
    try {
      const fileRecord = getFileRecord(pickupCode);
      
      if (!fileRecord) {
        logger.security('INVALID_PICKUP_CODE', {
          pickupCode,
          reason: 'NOT_FOUND'
        });
        
        return {
          success: false,
          error: '取件码不存在或已过期',
          code: 'NOT_FOUND'
        };
      }
      
      // 检查文件是否过期
      const now = Date.now();
      if (fileRecord.expiresAt < now) {
        logger.fileOperation('PICKUP_CODE_EXPIRED', {
          pickupCode,
          originalName: fileRecord.originalName,
          expiredAt: new Date(fileRecord.expiresAt)
        });
        
        return {
          success: false,
          error: '取件码已过期',
          code: 'EXPIRED',
          expiredAt: fileRecord.expiresAt
        };
      }
      
      // 检查物理文件是否存在
      if (!fileExists(fileRecord.filename)) {
        logger.error('物理文件不存在:', {
          pickupCode,
          filename: fileRecord.filename,
          originalName: fileRecord.originalName
        });
        
        // 清理无效记录
        deleteFileRecord(pickupCode);
        
        return {
          success: false,
          error: '文件不存在',
          code: 'FILE_NOT_FOUND'
        };
      }
      
      // 记录验证成功
      logger.fileOperation('VERIFY_SUCCESS', {
        pickupCode,
        originalName: fileRecord.originalName,
        downloadCount: fileRecord.downloadCount
      });
      
      return {
        success: true,
        file: {
          name: fileRecord.originalName,
          size: fileRecord.size,
          formattedSize: formatFileSize(fileRecord.size),
          mimetype: fileRecord.mimetype,
          uploadTime: fileRecord.uploadTime,
          expiresAt: fileRecord.expiresAt,
          timeRemaining: this.formatTimeRemaining(fileRecord.expiresAt - now),
          downloadCount: fileRecord.downloadCount,
          description: fileRecord.description,
          tags: fileRecord.tags
        }
      };
      
    } catch (error) {
      logger.error('验证取件码失败:', {
        pickupCode,
        error: error.message
      });
      
      return {
        success: false,
        error: '验证失败，请稍后重试',
        code: 'VERIFICATION_ERROR'
      };
    }
  }
  
  /**
   * 处理文件下载
   * @param {string} pickupCode - 取件码
   * @param {Object} downloadInfo - 下载信息
   * @returns {Object} 下载结果
   */
  async processDownload(pickupCode, downloadInfo = {}) {
    try {
      // 先验证取件码
      const verifyResult = await this.verifyPickupCode(pickupCode);
      
      if (!verifyResult.success) {
        return verifyResult;
      }
      
      const fileRecord = getFileRecord(pickupCode);
      const filePath = path.join('uploads', fileRecord.filename);
      
      // 更新下载统计
      fileRecord.downloadCount = (fileRecord.downloadCount || 0) + 1;
      fileRecord.lastDownloadTime = Date.now();
      fileRecord.lastDownloadIP = downloadInfo.ipAddress || 'unknown';
      
      // 保存更新后的记录
      saveFileRecord(pickupCode, fileRecord);
      
      // 记录下载操作
      logger.fileOperation('DOWNLOAD_SUCCESS', {
        pickupCode,
        originalName: fileRecord.originalName,
        filename: fileRecord.filename,
        downloadCount: fileRecord.downloadCount,
        ipAddress: downloadInfo.ipAddress,
        userAgent: downloadInfo.userAgent
      });
      
      return {
        success: true,
        filePath: path.resolve(filePath),
        filename: fileRecord.originalName,
        mimetype: fileRecord.mimetype,
        size: fileRecord.size
      };
      
    } catch (error) {
      logger.error('文件下载处理失败:', {
        pickupCode,
        error: error.message
      });
      
      return {
        success: false,
        error: '下载失败，请稍后重试',
        code: 'DOWNLOAD_ERROR'
      };
    }
  }
  
  /**
   * 获取文件统计信息
   * @returns {Object} 统计信息
   */
  getFileStatistics() {
    try {
      const { getFileStats } = require('../utils/fileManager');
      const { getCodeStats } = require('../utils/codeGenerator');
      
      const fileStats = getFileStats();
      const codeStats = getCodeStats();
      
      return {
        files: fileStats,
        codes: codeStats,
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: require('../../package.json').version
        }
      };
      
    } catch (error) {
      logger.error('获取统计信息失败:', error);
      return null;
    }
  }
  
  /**
   * 清理失败的上传
   * @param {string} filename - 文件名
   */
  cleanupFailedUpload(filename) {
    try {
      const filePath = path.join('uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info('清理失败上传的文件:', { filename });
      }
    } catch (error) {
      logger.error('清理失败上传文件错误:', {
        filename,
        error: error.message
      });
    }
  }
  
  /**
   * 格式化剩余时间
   * @param {number} milliseconds - 毫秒数
   * @returns {string} 格式化的时间
   */
  formatTimeRemaining(milliseconds) {
    if (milliseconds <= 0) return '已过期';
    
    const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000));
    const hours = Math.floor((milliseconds % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));
    
    if (days > 0) {
      return `${days}天${hours}小时`;
    } else if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  }
  
  /**
   * 删除文件和记录
   * @param {string} pickupCode - 取件码
   * @returns {boolean} 删除是否成功
   */
  async deleteFile(pickupCode) {
    try {
      const fileRecord = getFileRecord(pickupCode);
      
      if (!fileRecord) {
        return false;
      }
      
      // 删除物理文件
      const fileDeleted = deletePhysicalFile(fileRecord.filename);
      
      // 删除记录
      deleteFileRecord(pickupCode);
      
      logger.fileOperation('DELETE_FILE', {
        pickupCode,
        originalName: fileRecord.originalName,
        filename: fileRecord.filename,
        fileDeleted
      });
      
      return true;
      
    } catch (error) {
      logger.error('删除文件失败:', {
        pickupCode,
        error: error.message
      });
      
      return false;
    }
  }
}

module.exports = new FileService();
