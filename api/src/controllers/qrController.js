const QRCode = require('qrcode');
const logger = require('../utils/logger');

class QRController {
  /**
   * 生成取件码二维码
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async generatePickupQR(req, res) {
    const startTime = Date.now();
    
    try {
      const { code } = req.params;
      const { format = 'png', size = 200, margin = 4 } = req.query;

      // 验证取件码格式
      if (!code || !/^[A-Z0-9]{6}$/i.test(code)) {
        return res.status(400).json({
          success: false,
          error: '取件码格式无效',
          code: 'INVALID_CODE_FORMAT'
        });
      }

      // 构建取件链接
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const pickupUrl = `${baseUrl}/pickup?code=${code.toUpperCase()}`;

      // 二维码生成选项
      const options = {
        type: format === 'svg' ? 'svg' : 'png',
        width: parseInt(size) || 200,
        margin: parseInt(margin) || 4,
        color: {
          dark: '#000000',  // 前景色
          light: '#FFFFFF'  // 背景色
        },
        errorCorrectionLevel: 'M'
      };

      // 生成二维码
      let qrData;
      if (format === 'svg') {
        qrData = await QRCode.toString(pickupUrl, { ...options, type: 'svg' });
        res.setHeader('Content-Type', 'image/svg+xml');
      } else {
        qrData = await QRCode.toDataURL(pickupUrl, options);
        
        // 如果请求下载
        if (req.query.download === 'true') {
          const base64Data = qrData.replace(/^data:image\/png;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');
          
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Content-Disposition', `attachment; filename="pickup-code-${code}.png"`);
          res.setHeader('Content-Length', buffer.length);
          
          return res.send(buffer);
        }
      }

      // 记录性能指标
      logger.performance('QR_CODE_GENERATE', Date.now() - startTime);

      // 返回二维码数据
      res.json({
        success: true,
        message: '二维码生成成功',
        data: {
          pickupCode: code.toUpperCase(),
          qrData: qrData,
          pickupUrl: pickupUrl,
          format: format,
          size: parseInt(size),
          generatedAt: new Date().toISOString()
        }
      });

      // 记录操作日志
      logger.fileOperation('QR_GENERATE', {
        pickupCode: code.toUpperCase(),
        format,
        size: parseInt(size),
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

    } catch (error) {
      logger.error('二维码生成失败:', {
        error: error.message,
        stack: error.stack,
        code: req.params.code,
        ip: req.ip,
        processingTime: Date.now() - startTime
      });

      res.status(500).json({
        success: false,
        error: '二维码生成失败',
        code: 'QR_GENERATION_ERROR'
      });
    }
  }

  /**
   * 生成批量二维码
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async generateBatchQR(req, res) {
    try {
      const { codes } = req.body;
      const { format = 'png', size = 200 } = req.query;

      // 验证输入
      if (!Array.isArray(codes) || codes.length === 0) {
        return res.status(400).json({
          success: false,
          error: '请提供有效的取件码数组',
          code: 'INVALID_INPUT'
        });
      }

      if (codes.length > 10) {
        return res.status(400).json({
          success: false,
          error: '批量生成最多支持10个二维码',
          code: 'TOO_MANY_CODES'
        });
      }

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const results = [];

      // 生成选项
      const options = {
        width: parseInt(size) || 200,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      };

      // 批量生成二维码
      for (const code of codes) {
        try {
          // 验证取件码格式
          if (!/^[A-Z0-9]{6}$/i.test(code)) {
            results.push({
              code: code,
              success: false,
              error: '取件码格式无效'
            });
            continue;
          }

          const pickupUrl = `${baseUrl}/pickup?code=${code.toUpperCase()}`;
          const qrData = await QRCode.toDataURL(pickupUrl, options);

          results.push({
            code: code.toUpperCase(),
            success: true,
            qrData: qrData,
            pickupUrl: pickupUrl
          });

        } catch (error) {
          results.push({
            code: code,
            success: false,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        message: '批量二维码生成完成',
        data: {
          total: codes.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          results: results,
          generatedAt: new Date().toISOString()
        }
      });

      logger.fileOperation('QR_BATCH_GENERATE', {
        total: codes.length,
        successful: results.filter(r => r.success).length,
        ip: req.ip
      });

    } catch (error) {
      logger.error('批量二维码生成失败:', {
        error: error.message,
        ip: req.ip
      });

      res.status(500).json({
        success: false,
        error: '批量二维码生成失败',
        code: 'BATCH_QR_ERROR'
      });
    }
  }

  /**
   * 获取二维码生成统计
   * @param {Object} req - Express请求对象
   * @param {Object} res - Express响应对象
   */
  async getQRStats(req, res) {
    try {
      // 这里可以从日志或数据库中获取统计信息
      // 简单示例，实际应用中需要更复杂的统计逻辑
      
      res.json({
        success: true,
        data: {
          totalGenerated: 0, // 从日志或数据库获取
          todayGenerated: 0,
          popularFormats: {
            png: 0,
            svg: 0
          },
          averageSize: 200,
          lastGenerated: null
        }
      });

    } catch (error) {
      logger.error('获取二维码统计失败:', error);
      
      res.status(500).json({
        success: false,
        error: '获取统计信息失败',
        code: 'STATS_ERROR'
      });
    }
  }
}

module.exports = new QRController();
