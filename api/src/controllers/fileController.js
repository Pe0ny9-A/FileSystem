const fileService = require('../services/fileService');
const logger = require('../utils/logger');

class FileController {
  /**
   * 处理文件上传
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async uploadFile(req, res) {
    const startTime = Date.now();
    
    try {
      // 检查是否有文件上传
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: '没有上传文件',
          code: 'NO_FILE'
        });
      }

      // 准备元数据
      const metadata = {
        description: req.body.description || '',
        tags: req.body.tags || '',
        expiryDays: parseInt(req.body.expiryDays) || 7,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown'
      };

      // 处理文件上传
      const result = await fileService.processUpload(req.file, metadata);

      // 记录性能指标
      logger.performance('FILE_UPLOAD_COMPLETE', Date.now() - startTime);

      // 返回成功响应
      res.status(201).json({
        success: true,
        message: '文件上传成功',
        data: result
      });

    } catch (error) {
      logger.error('文件上传控制器错误:', {
        error: error.message,
        stack: error.stack,
        filename: req.file?.filename,
        originalname: req.file?.originalname,
        ip: req.ip,
        processingTime: Date.now() - startTime
      });

      // 根据错误类型返回不同的错误信息
      if (error.message.includes('取件码')) {
        return res.status(500).json({
          success: false,
          error: '生成取件码失败，请稍后重试',
          code: 'CODE_GENERATION_FAILED'
        });
      }

      res.status(500).json({
        success: false,
        error: '文件上传失败，请稍后重试',
        code: 'UPLOAD_FAILED'
      });
    }
  }

  /**
   * 验证取件码
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async verifyPickupCode(req, res) {
    const startTime = Date.now();
    
    try {
      const { code } = req.params;

      // 验证取件码
      const result = await fileService.verifyPickupCode(code.toUpperCase());

      // 记录性能指标
      logger.performance('PICKUP_CODE_VERIFY', Date.now() - startTime);

      if (result.success) {
        res.json({
          success: true,
          message: '取件码验证成功',
          data: result.file
        });
      } else {
        // 根据错误类型返回不同的状态码
        let statusCode = 404;
        if (result.code === 'EXPIRED') {
          statusCode = 410; // Gone
        } else if (result.code === 'FILE_NOT_FOUND') {
          statusCode = 404;
        }

        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code,
          ...(result.expiredAt && { expiredAt: result.expiredAt })
        });
      }

    } catch (error) {
      logger.error('验证取件码控制器错误:', {
        error: error.message,
        code: req.params.code,
        ip: req.ip,
        processingTime: Date.now() - startTime
      });

      res.status(500).json({
        success: false,
        error: '验证失败，请稍后重试',
        code: 'VERIFICATION_ERROR'
      });
    }
  }

  /**
   * 下载文件
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async downloadFile(req, res) {
    const startTime = Date.now();
    
    try {
      const { code } = req.params;

      // 准备下载信息
      const downloadInfo = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown'
      };

      // 处理文件下载
      const result = await fileService.processDownload(code.toUpperCase(), downloadInfo);

      if (!result.success) {
        // 根据错误类型返回不同的状态码
        let statusCode = 404;
        if (result.code === 'EXPIRED') {
          statusCode = 410; // Gone
        } else if (result.code === 'FILE_NOT_FOUND') {
          statusCode = 404;
        }

        return res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code
        });
      }

      // 设置下载响应头
      res.setHeader('Content-Disposition', 
        `attachment; filename*=UTF-8''${encodeURIComponent(result.filename)}`);
      res.setHeader('Content-Type', result.mimetype || 'application/octet-stream');
      res.setHeader('Content-Length', result.size);
      
      // 添加缓存控制头
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // 记录性能指标
      logger.performance('FILE_DOWNLOAD_START', Date.now() - startTime);

      // 发送文件
      res.sendFile(result.filePath, (err) => {
        if (err) {
          logger.error('文件发送失败:', {
            error: err.message,
            filePath: result.filePath,
            code: code,
            ip: req.ip
          });
          
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: '文件下载失败',
              code: 'DOWNLOAD_ERROR'
            });
          }
        } else {
          logger.performance('FILE_DOWNLOAD_COMPLETE', Date.now() - startTime);
        }
      });

    } catch (error) {
      logger.error('文件下载控制器错误:', {
        error: error.message,
        code: req.params.code,
        ip: req.ip,
        processingTime: Date.now() - startTime
      });

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: '下载失败，请稍后重试',
          code: 'DOWNLOAD_FAILED'
        });
      }
    }
  }

  /**
   * 获取系统统计信息
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getStatistics(req, res) {
    try {
      const stats = fileService.getFileStatistics();

      if (!stats) {
        return res.status(500).json({
          success: false,
          error: '获取统计信息失败',
          code: 'STATS_ERROR'
        });
      }

      res.json({
        success: true,
        message: '获取统计信息成功',
        data: stats
      });

    } catch (error) {
      logger.error('获取统计信息控制器错误:', {
        error: error.message,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: '获取统计信息失败',
        code: 'STATS_ERROR'
      });
    }
  }

  /**
   * 删除文件（管理员功能）
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async deleteFile(req, res) {
    try {
      const { code } = req.params;

      // 删除文件
      const success = await fileService.deleteFile(code.toUpperCase());

      if (success) {
        res.json({
          success: true,
          message: '文件删除成功'
        });
      } else {
        res.status(404).json({
          success: false,
          error: '文件不存在或删除失败',
          code: 'DELETE_FAILED'
        });
      }

    } catch (error) {
      logger.error('删除文件控制器错误:', {
        error: error.message,
        code: req.params.code,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: '删除失败，请稍后重试',
        code: 'DELETE_ERROR'
      });
    }
  }

  /**
   * 获取文件信息（不触发下载）
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getFileInfo(req, res) {
    try {
      const { code } = req.params;

      // 验证取件码并获取文件信息
      const result = await fileService.verifyPickupCode(code.toUpperCase());

      if (result.success) {
        res.json({
          success: true,
          message: '获取文件信息成功',
          data: result.file
        });
      } else {
        let statusCode = 404;
        if (result.code === 'EXPIRED') {
          statusCode = 410;
        }

        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code
        });
      }

    } catch (error) {
      logger.error('获取文件信息控制器错误:', {
        error: error.message,
        code: req.params.code,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: '获取文件信息失败',
        code: 'INFO_ERROR'
      });
    }
  }
}

module.exports = new FileController();
