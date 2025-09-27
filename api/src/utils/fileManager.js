const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * 创建必要的目录
 */
function createDirectories() {
  const directories = [
    'uploads',
    'data', 
    'logs',
    'temp'
  ];
  
  directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logger.info(`创建目录: ${dir}`);
    }
  });
}

/**
 * 读取文件记录
 * @returns {Object} 文件记录对象
 */
function readFileRecords() {
  const filePath = path.join('data', 'files.json');
  
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    logger.error('读取文件记录失败:', error);
  }
  
  return {};
}

/**
 * 保存文件记录
 * @param {Object} records - 文件记录对象
 */
function saveFileRecords(records) {
  const filePath = path.join('data', 'files.json');
  
  try {
    // 创建备份
    if (fs.existsSync(filePath)) {
      const backupPath = path.join('data', `files.json.bak.${Date.now()}`);
      fs.copyFileSync(filePath, backupPath);
      
      // 保留最近3个备份
      cleanupBackups();
    }
    
    // 保存新数据
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2));
    logger.debug('文件记录已保存');
    
  } catch (error) {
    logger.error('保存文件记录失败:', error);
    throw error;
  }
}

/**
 * 清理备份文件
 */
function cleanupBackups() {
  try {
    const dataDir = path.join('data');
    const files = fs.readdirSync(dataDir);
    const backupFiles = files
      .filter(file => file.startsWith('files.json.bak.'))
      .map(file => ({
        name: file,
        path: path.join(dataDir, file),
        time: parseInt(file.split('.').pop())
      }))
      .sort((a, b) => b.time - a.time);
    
    // 保留最近3个备份，删除其余的
    if (backupFiles.length > 3) {
      backupFiles.slice(3).forEach(backup => {
        fs.unlinkSync(backup.path);
        logger.debug(`删除备份文件: ${backup.name}`);
      });
    }
  } catch (error) {
    logger.error('清理备份文件失败:', error);
  }
}

/**
 * 获取文件信息
 * @param {string} pickupCode - 取件码
 * @returns {Object|null} 文件信息
 */
function getFileRecord(pickupCode) {
  const records = readFileRecords();
  return records[pickupCode] || null;
}

/**
 * 保存文件记录
 * @param {string} pickupCode - 取件码
 * @param {Object} fileInfo - 文件信息
 */
function saveFileRecord(pickupCode, fileInfo) {
  const records = readFileRecords();
  records[pickupCode] = {
    ...fileInfo,
    uploadTime: Date.now(),
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7天后过期
  };
  
  saveFileRecords(records);
  
  logger.fileOperation('SAVE_RECORD', {
    pickupCode,
    filename: fileInfo.originalName,
    size: fileInfo.size
  });
}

/**
 * 删除文件记录
 * @param {string} pickupCode - 取件码
 */
function deleteFileRecord(pickupCode) {
  const records = readFileRecords();
  const fileInfo = records[pickupCode];
  
  if (fileInfo) {
    delete records[pickupCode];
    saveFileRecords(records);
    
    logger.fileOperation('DELETE_RECORD', {
      pickupCode,
      filename: fileInfo.originalName
    });
  }
}

/**
 * 检查文件是否存在
 * @param {string} filename - 文件名
 * @returns {boolean} 文件是否存在
 */
function fileExists(filename) {
  const filePath = path.join('uploads', filename);
  return fs.existsSync(filePath);
}

/**
 * 删除物理文件
 * @param {string} filename - 文件名
 */
function deletePhysicalFile(filename) {
  try {
    const filePath = path.join('uploads', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.fileOperation('DELETE_FILE', { filename });
      return true;
    }
  } catch (error) {
    logger.error('删除文件失败:', { filename, error: error.message });
    return false;
  }
  return false;
}

/**
 * 获取文件统计信息
 * @returns {Object} 统计信息
 */
function getFileStats() {
  const records = readFileRecords();
  const now = Date.now();
  
  let totalFiles = 0;
  let activeFiles = 0;
  let totalSize = 0;
  
  Object.values(records).forEach(record => {
    totalFiles++;
    if (record.expiresAt > now) {
      activeFiles++;
      totalSize += record.size || 0;
    }
  });
  
  return {
    totalFiles,
    activeFiles,
    expiredFiles: totalFiles - activeFiles,
    totalSize,
    formattedSize: formatFileSize(totalSize)
  };
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化的大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 验证文件路径安全性
 * @param {string} filename - 文件名
 * @returns {boolean} 是否安全
 */
function isFilePathSafe(filename) {
  // 防止路径遍历攻击
  const normalizedPath = path.normalize(filename);
  return !normalizedPath.includes('..') && 
         !normalizedPath.startsWith('/') && 
         !normalizedPath.includes('\\');
}

module.exports = {
  createDirectories,
  readFileRecords,
  saveFileRecords,
  getFileRecord,
  saveFileRecord,
  deleteFileRecord,
  fileExists,
  deletePhysicalFile,
  getFileStats,
  formatFileSize,
  isFilePathSafe
};
