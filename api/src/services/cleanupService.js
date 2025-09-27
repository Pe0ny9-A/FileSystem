const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { readFileRecords, saveFileRecords, deletePhysicalFile, getFileStats } = require('../utils/fileManager');
const { cleanupExpiredCodes } = require('../utils/codeGenerator');

class CleanupService {
  constructor() {
    this.isRunning = false;
    this.cleanupTasks = new Map();
  }

  /**
   * 启动清理服务
   */
  start() {
    if (this.isRunning) {
      logger.warn('清理服务已在运行');
      return;
    }

    this.isRunning = true;
    logger.info('🧹 启动文件清理服务');

    // 立即执行一次清理
    this.performCleanup();

    // 定时任务：每小时清理过期文件
    this.scheduleTask('hourly-cleanup', '0 * * * *', () => {
      this.performCleanup();
    });

    // 定时任务：每天凌晨2点深度清理
    this.scheduleTask('daily-deep-cleanup', '0 2 * * *', () => {
      this.performDeepCleanup();
    });

    // 定时任务：每周日凌晨3点清理日志文件
    this.scheduleTask('weekly-log-cleanup', '0 3 * * 0', () => {
      this.cleanupLogs();
    });

    // 定时任务：每10分钟检查系统健康
    this.scheduleTask('health-check', '*/10 * * * *', () => {
      this.performHealthCheck();
    });
  }

  /**
   * 停止清理服务
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('清理服务未运行');
      return;
    }

    this.isRunning = false;
    
    // 停止所有定时任务
    this.cleanupTasks.forEach((task, name) => {
      task.stop();
      logger.info(`停止定时任务: ${name}`);
    });
    
    this.cleanupTasks.clear();
    logger.info('🛑 清理服务已停止');
  }

  /**
   * 注册定时任务
   * @param {string} name - 任务名称
   * @param {string} schedule - cron表达式
   * @param {Function} callback - 回调函数
   */
  scheduleTask(name, schedule, callback) {
    try {
      const task = cron.schedule(schedule, async () => {
        try {
          logger.debug(`执行定时任务: ${name}`);
          await callback();
        } catch (error) {
          logger.error(`定时任务执行失败: ${name}`, error);
        }
      }, {
        scheduled: false,
        timezone: 'Asia/Shanghai'
      });

      task.start();
      this.cleanupTasks.set(name, task);
      logger.info(`注册定时任务: ${name} (${schedule})`);
      
    } catch (error) {
      logger.error(`注册定时任务失败: ${name}`, error);
    }
  }

  /**
   * 执行常规清理
   */
  async performCleanup() {
    const startTime = Date.now();
    logger.info('开始执行文件清理...');

    try {
      // 清理过期文件
      const expiredCount = await this.cleanupExpiredFiles();
      
      // 清理孤儿文件
      const orphanCount = await this.cleanupOrphanFiles();
      
      // 清理临时文件
      const tempCount = await this.cleanupTempFiles();

      const duration = Date.now() - startTime;
      
      logger.info('文件清理完成', {
        expiredFiles: expiredCount,
        orphanFiles: orphanCount,
        tempFiles: tempCount,
        duration: `${duration}ms`
      });

      // 记录清理统计
      this.logCleanupStats();

    } catch (error) {
      logger.error('文件清理失败:', error);
    }
  }

  /**
   * 执行深度清理
   */
  async performDeepCleanup() {
    logger.info('开始执行深度清理...');

    try {
      // 执行常规清理
      await this.performCleanup();

      // 清理备份文件
      await this.cleanupBackupFiles();

      // 整理文件记录
      await this.defragmentFileRecords();

      // 检查文件系统一致性
      await this.checkFileSystemConsistency();

      logger.info('深度清理完成');

    } catch (error) {
      logger.error('深度清理失败:', error);
    }
  }

  /**
   * 清理过期文件
   * @returns {number} 清理的文件数量
   */
  async cleanupExpiredFiles() {
    const records = readFileRecords();
    const now = Date.now();
    let cleanedCount = 0;

    const activeRecords = {};

    for (const [pickupCode, record] of Object.entries(records)) {
      if (record.expiresAt && record.expiresAt < now) {
        // 删除物理文件
        if (deletePhysicalFile(record.filename)) {
          cleanedCount++;
          logger.fileOperation('CLEANUP_EXPIRED', {
            pickupCode,
            originalName: record.originalName,
            filename: record.filename,
            expiredAt: new Date(record.expiresAt)
          });
        }
      } else {
        // 保留未过期的记录
        activeRecords[pickupCode] = record;
      }
    }

    // 保存更新后的记录
    if (cleanedCount > 0) {
      saveFileRecords(activeRecords);
    }

    return cleanedCount;
  }

  /**
   * 清理孤儿文件（有物理文件但无记录）
   * @returns {number} 清理的文件数量
   */
  async cleanupOrphanFiles() {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      return 0;
    }

    const records = readFileRecords();
    const recordedFiles = new Set(Object.values(records).map(r => r.filename));
    
    let cleanedCount = 0;

    try {
      const files = fs.readdirSync(uploadsDir);
      
      for (const file of files) {
        // 跳过隐藏文件和目录
        if (file.startsWith('.')) continue;
        
        const filePath = path.join(uploadsDir, file);
        const stat = fs.statSync(filePath);
        
        // 只处理文件，不处理目录
        if (!stat.isFile()) continue;
        
        // 检查文件是否在记录中
        if (!recordedFiles.has(file)) {
          // 检查文件是否太新（可能正在上传）
          const fileAge = Date.now() - stat.mtime.getTime();
          if (fileAge > 60 * 60 * 1000) { // 1小时
            try {
              fs.unlinkSync(filePath);
              cleanedCount++;
              
              logger.fileOperation('CLEANUP_ORPHAN', {
                filename: file,
                size: stat.size,
                age: fileAge
              });
            } catch (error) {
              logger.error('删除孤儿文件失败:', {
                filename: file,
                error: error.message
              });
            }
          }
        }
      }
    } catch (error) {
      logger.error('扫描上传目录失败:', error);
    }

    return cleanedCount;
  }

  /**
   * 清理临时文件
   * @returns {number} 清理的文件数量
   */
  async cleanupTempFiles() {
    const tempDir = path.join(process.cwd(), 'temp');
    
    if (!fs.existsSync(tempDir)) {
      return 0;
    }

    let cleanedCount = 0;

    try {
      const files = fs.readdirSync(tempDir);
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stat = fs.statSync(filePath);
        
        // 删除超过1小时的临时文件
        const fileAge = Date.now() - stat.mtime.getTime();
        if (fileAge > 60 * 60 * 1000) {
          try {
            if (stat.isDirectory()) {
              fs.rmSync(filePath, { recursive: true });
            } else {
              fs.unlinkSync(filePath);
            }
            cleanedCount++;
            
            logger.fileOperation('CLEANUP_TEMP', {
              filename: file,
              size: stat.size,
              age: fileAge
            });
          } catch (error) {
            logger.error('删除临时文件失败:', {
              filename: file,
              error: error.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('清理临时文件失败:', error);
    }

    return cleanedCount;
  }

  /**
   * 清理备份文件
   */
  async cleanupBackupFiles() {
    const dataDir = path.join(process.cwd(), 'data');
    
    if (!fs.existsSync(dataDir)) {
      return;
    }

    try {
      const files = fs.readdirSync(dataDir);
      const backupFiles = files
        .filter(file => file.startsWith('files.json.bak.'))
        .map(file => ({
          name: file,
          path: path.join(dataDir, file),
          time: parseInt(file.split('.').pop())
        }))
        .sort((a, b) => b.time - a.time);

      // 保留最近10个备份，删除其余的
      if (backupFiles.length > 10) {
        const filesToDelete = backupFiles.slice(10);
        
        for (const backup of filesToDelete) {
          try {
            fs.unlinkSync(backup.path);
            logger.fileOperation('CLEANUP_BACKUP', {
              filename: backup.name,
              backupTime: new Date(backup.time)
            });
          } catch (error) {
            logger.error('删除备份文件失败:', {
              filename: backup.name,
              error: error.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('清理备份文件失败:', error);
    }
  }

  /**
   * 清理日志文件
   */
  async cleanupLogs() {
    const logsDir = path.join(process.cwd(), 'logs');
    
    if (!fs.existsSync(logsDir)) {
      return;
    }

    try {
      const files = fs.readdirSync(logsDir);
      const now = Date.now();
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天

      for (const file of files) {
        const filePath = path.join(logsDir, file);
        const stat = fs.statSync(filePath);
        
        if (now - stat.mtime.getTime() > maxAge) {
          try {
            fs.unlinkSync(filePath);
            logger.info('删除过期日志文件:', { filename: file });
          } catch (error) {
            logger.error('删除日志文件失败:', {
              filename: file,
              error: error.message
            });
          }
        }
      }
    } catch (error) {
      logger.error('清理日志文件失败:', error);
    }
  }

  /**
   * 整理文件记录
   */
  async defragmentFileRecords() {
    try {
      const records = readFileRecords();
      const cleanRecords = {};
      
      // 移除无效字段，整理数据结构
      for (const [code, record] of Object.entries(records)) {
        cleanRecords[code] = {
          originalName: record.originalName,
          filename: record.filename,
          size: record.size,
          mimetype: record.mimetype,
          uploadTime: record.uploadTime,
          expiresAt: record.expiresAt,
          downloadCount: record.downloadCount || 0,
          lastDownloadTime: record.lastDownloadTime || null,
          description: record.description || '',
          tags: record.tags || ''
        };
      }
      
      saveFileRecords(cleanRecords);
      logger.info('文件记录整理完成');
      
    } catch (error) {
      logger.error('整理文件记录失败:', error);
    }
  }

  /**
   * 检查文件系统一致性
   */
  async checkFileSystemConsistency() {
    try {
      const records = readFileRecords();
      let inconsistencies = 0;
      
      for (const [code, record] of Object.entries(records)) {
        const filePath = path.join('uploads', record.filename);
        
        if (!fs.existsSync(filePath)) {
          logger.warn('发现不一致：记录存在但文件不存在', {
            pickupCode: code,
            filename: record.filename,
            originalName: record.originalName
          });
          inconsistencies++;
        }
      }
      
      if (inconsistencies > 0) {
        logger.warn(`发现 ${inconsistencies} 个文件系统不一致`);
      } else {
        logger.info('文件系统一致性检查通过');
      }
      
    } catch (error) {
      logger.error('文件系统一致性检查失败:', error);
    }
  }

  /**
   * 执行系统健康检查
   */
  async performHealthCheck() {
    try {
      const stats = getFileStats();
      const memoryUsage = process.memoryUsage();
      const diskUsage = await this.getDiskUsage();
      
      // 检查内存使用
      const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      if (memoryUsagePercent > 80) {
        logger.warn('内存使用率过高', {
          usage: `${memoryUsagePercent.toFixed(2)}%`,
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal
        });
      }
      
      // 检查磁盘空间
      if (diskUsage && diskUsage.usagePercent > 90) {
        logger.warn('磁盘空间不足', diskUsage);
      }
      
      logger.debug('系统健康检查', {
        files: stats,
        memory: memoryUsage,
        disk: diskUsage
      });
      
    } catch (error) {
      logger.error('系统健康检查失败:', error);
    }
  }

  /**
   * 获取磁盘使用情况
   * @returns {Object} 磁盘使用信息
   */
  async getDiskUsage() {
    try {
      const fs = require('fs');
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      if (!fs.existsSync(uploadsDir)) {
        return null;
      }
      
      // 简单的磁盘使用统计
      let totalSize = 0;
      const files = fs.readdirSync(uploadsDir);
      
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          totalSize += stat.size;
        }
      }
      
      return {
        totalSize,
        formattedSize: this.formatFileSize(totalSize)
      };
      
    } catch (error) {
      logger.error('获取磁盘使用情况失败:', error);
      return null;
    }
  }

  /**
   * 记录清理统计信息
   */
  logCleanupStats() {
    try {
      const stats = getFileStats();
      logger.info('当前系统状态', stats);
    } catch (error) {
      logger.error('获取清理统计失败:', error);
    }
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 创建单例实例
const cleanupService = new CleanupService();

/**
 * 启动清理服务
 */
function startCleanupService() {
  cleanupService.start();
}

/**
 * 停止清理服务
 */
function stopCleanupService() {
  cleanupService.stop();
}

module.exports = {
  startCleanupService,
  stopCleanupService,
  cleanupService
};
