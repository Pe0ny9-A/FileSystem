import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { ElMessage } from 'element-plus'

// API响应接口
export interface ApiResponse<T = any> {
  success: boolean
  message?: string
  data?: T
  error?: string
  code?: string
  timestamp?: string
}

// 文件上传响应接口
export interface UploadResponse {
  pickupCode: string
  originalName: string
  size: number
  formattedSize: string
  mimetype: string
  expiresAt: number
  expiresIn: string
}

// 文件信息接口
export interface FileInfo {
  name: string
  size: number
  formattedSize: string
  mimetype: string
  uploadTime: number
  expiresAt: number
  timeRemaining: string
  downloadCount: number
  description?: string
  tags?: string
}

// 系统统计接口
export interface SystemStats {
  files: {
    totalFiles: number
    activeFiles: number
    expiredFiles: number
    totalSize: number
    formattedSize: string
  }
  codes: {
    totalCodes: number
    activeCodes: number
    expiredCodes: number
    downloadedCodes: number
    usageRate: string
  }
  system: {
    uptime: number
    memory: NodeJS.MemoryUsage
    version: string
  }
}

// 创建axios实例
const createApiInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    timeout: 30000, // 30秒超时
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // 请求拦截器
  instance.interceptors.request.use(
    (config) => {
      // 添加请求ID用于追踪
      config.headers['X-Request-ID'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // 添加时间戳防止缓存
      if (config.method === 'get') {
        config.params = {
          ...config.params,
          _t: Date.now()
        }
      }
      
      // 记录请求开始时间
      config.metadata = { startTime: Date.now() }
      
      console.log(`🚀 API请求: ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params)
      
      return config
    },
    (error) => {
      console.error('❌ 请求拦截器错误:', error)
      return Promise.reject(error)
    }
  )

  // 响应拦截器
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // 计算请求耗时
      const duration = Date.now() - (response.config.metadata?.startTime || 0)
      
      console.log(
        `✅ API响应: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`,
        response.data
      )
      
      return response
    },
    (error: AxiosError) => {
      // 计算请求耗时
      const duration = Date.now() - (error.config?.metadata?.startTime || 0)
      
      console.error(
        `❌ API错误: ${error.config?.method?.toUpperCase()} ${error.config?.url} (${duration}ms)`,
        error.response?.data || error.message
      )
      
      // 统一错误处理
      handleApiError(error)
      
      return Promise.reject(error)
    }
  )

  return instance
}

// 错误处理函数
const handleApiError = (error: AxiosError) => {
  let message = '请求失败，请稍后重试'
  
  if (error.response) {
    // 服务器响应错误
    const { status, data } = error.response
    const apiResponse = data as ApiResponse
    
    switch (status) {
      case 400:
        message = apiResponse.error || '请求参数错误'
        break
      case 401:
        message = '未授权访问'
        break
      case 403:
        message = '访问被拒绝'
        break
      case 404:
        message = apiResponse.error || '资源不存在'
        break
      case 410:
        message = apiResponse.error || '资源已过期'
        break
      case 413:
        message = '文件过大，请选择小于50MB的文件'
        break
      case 429:
        message = '请求过于频繁，请稍后再试'
        break
      case 500:
        message = '服务器内部错误'
        break
      case 502:
        message = '服务器网关错误'
        break
      case 503:
        message = '服务暂时不可用'
        break
      case 504:
        message = '请求超时'
        break
      default:
        message = apiResponse.error || `请求失败 (${status})`
    }
  } else if (error.request) {
    // 网络错误
    if (error.code === 'ECONNABORTED') {
      message = '请求超时，请检查网络连接'
    } else if (error.code === 'ERR_NETWORK') {
      message = '网络连接失败，请检查网络设置'
    } else {
      message = '网络错误，请检查网络连接'
    }
  }
  
  // 显示错误消息（除了某些特定情况）
  if (!error.config?.skipErrorMessage) {
    ElMessage.error(message)
  }
}

// 创建API实例
const api = createApiInstance()

// API方法封装
export const apiClient = {
  /**
   * 上传文件
   */
  async uploadFile(file: File, options?: {
    description?: string
    tags?: string
    expiryDays?: number
    onProgress?: (progress: number) => void
  }): Promise<UploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    
    if (options?.description) {
      formData.append('description', options.description)
    }
    if (options?.tags) {
      formData.append('tags', options.tags)
    }
    if (options?.expiryDays) {
      formData.append('expiryDays', options.expiryDays.toString())
    }

    const response = await api.post<ApiResponse<UploadResponse>>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (options?.onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          options.onProgress(progress)
        }
      },
    })

    if (!response.data.success) {
      throw new Error(response.data.error || '上传失败')
    }

    return response.data.data!
  },

  /**
   * 验证取件码
   */
  async verifyPickupCode(code: string): Promise<FileInfo> {
    const response = await api.get<ApiResponse<FileInfo>>(`/files/verify/${code}`)
    
    if (!response.data.success) {
      throw new Error(response.data.error || '验证失败')
    }
    
    return response.data.data!
  },

  /**
   * 获取文件信息（不触发下载）
   */
  async getFileInfo(code: string): Promise<FileInfo> {
    const response = await api.get<ApiResponse<FileInfo>>(`/files/info/${code}`)
    
    if (!response.data.success) {
      throw new Error(response.data.error || '获取文件信息失败')
    }
    
    return response.data.data!
  },

  /**
   * 下载文件
   */
  async downloadFile(code: string): Promise<Blob> {
    const response = await api.get(`/files/download/${code}`, {
      responseType: 'blob',
    })
    
    return response.data
  },

  /**
   * 获取下载链接
   */
  getDownloadUrl(code: string): string {
    const baseURL = api.defaults.baseURL || '/api'
    return `${baseURL}/files/download/${code}`
  },

  /**
   * 获取系统统计信息
   */
  async getSystemStats(): Promise<SystemStats> {
    const response = await api.get<ApiResponse<SystemStats>>('/system/stats')
    
    if (!response.data.success) {
      throw new Error(response.data.error || '获取统计信息失败')
    }
    
    return response.data.data!
  },

  /**
   * 获取系统状态
   */
  async getSystemStatus(): Promise<any> {
    const response = await api.get<ApiResponse>('/system/status')
    
    if (!response.data.success) {
      throw new Error(response.data.error || '获取系统状态失败')
    }
    
    return response.data.data!
  },

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      // 直接访问后端健康检查接口
      const response = await axios.get('http://localhost:3000/health', {
        timeout: 5000
      })
      return response.status === 200
    } catch {
      return false
    }
  },

  /**
   * 生成取件码二维码
   */
  async generateQRCode(code: string, options?: {
    format?: 'png' | 'svg'
    size?: number
    margin?: number
  }): Promise<{
    qrData: string
    pickupUrl: string
    format: string
    size: number
  }> {
    const params = new URLSearchParams()
    if (options?.format) params.append('format', options.format)
    if (options?.size) params.append('size', options.size.toString())
    if (options?.margin) params.append('margin', options.margin.toString())

    const response = await api.get<ApiResponse<{
      pickupCode: string
      qrData: string
      pickupUrl: string
      format: string
      size: number
      generatedAt: string
    }>>(`/qr/generate/${code}${params.toString() ? '?' + params.toString() : ''}`)
    
    if (!response.data.success) {
      throw new Error(response.data.error || '生成二维码失败')
    }
    
    return response.data.data!
  },

  /**
   * 下载二维码
   */
  async downloadQRCode(code: string, options?: {
    size?: number
    margin?: number
  }): Promise<Blob> {
    const params = new URLSearchParams()
    params.append('download', 'true')
    if (options?.size) params.append('size', options.size.toString())
    if (options?.margin) params.append('margin', options.margin.toString())

    const response = await api.get(`/qr/generate/${code}?${params.toString()}`, {
      responseType: 'blob'
    })
    
    return response.data
  },

  /**
   * 批量生成二维码
   */
  async generateBatchQRCodes(codes: string[], options?: {
    format?: 'png' | 'svg'
    size?: number
  }): Promise<{
    total: number
    successful: number
    failed: number
    results: Array<{
      code: string
      success: boolean
      qrData?: string
      pickupUrl?: string
      error?: string
    }>
  }> {
    const params = new URLSearchParams()
    if (options?.format) params.append('format', options.format)
    if (options?.size) params.append('size', options.size.toString())

    const response = await api.post<ApiResponse<{
      total: number
      successful: number
      failed: number
      results: Array<{
        code: string
        success: boolean
        qrData?: string
        pickupUrl?: string
        error?: string
      }>
      generatedAt: string
    }>>(`/qr/batch${params.toString() ? '?' + params.toString() : ''}`, {
      codes
    })
    
    if (!response.data.success) {
      throw new Error(response.data.error || '批量生成二维码失败')
    }
    
    return response.data.data!
  }
}

// 工具函数
export const apiUtils = {
  /**
   * 检查网络连接
   */
  async checkConnection(): Promise<boolean> {
    return await apiClient.healthCheck()
  },

  /**
   * 重试请求
   */
  async retry<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxAttempts) {
          throw lastError
        }
        
        console.log(`重试请求 (${attempt}/${maxAttempts})...`)
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
      }
    }
    
    throw lastError!
  },

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  },

  /**
   * 格式化时间
   */
  formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString('zh-CN')
  },

  /**
   * 格式化剩余时间
   */
  formatTimeRemaining(milliseconds: number): string {
    if (milliseconds <= 0) return '已过期'
    
    const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000))
    const hours = Math.floor((milliseconds % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000))
    
    if (days > 0) {
      return `${days}天${hours}小时`
    } else if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    } else {
      return `${minutes}分钟`
    }
  },

  /**
   * 验证取件码格式
   */
  validatePickupCode(code: string): boolean {
    return /^[A-Z0-9]{6}$/.test(code)
  },

  /**
   * 验证文件类型
   */
  validateFileType(file: File, allowedTypes?: string[]): boolean {
    if (!allowedTypes || allowedTypes.length === 0) {
      return true
    }
    
    return allowedTypes.some(type => {
      if (type.startsWith('.')) {
        // 扩展名匹配
        return file.name.toLowerCase().endsWith(type.toLowerCase())
      } else {
        // MIME类型匹配
        return file.type === type
      }
    })
  },

  /**
   * 验证文件大小
   */
  validateFileSize(file: File, maxSize: number = 50 * 1024 * 1024): boolean {
    return file.size <= maxSize
  }
}

export default api
