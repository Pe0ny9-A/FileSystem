import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface NotificationItem {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  duration?: number
  showClose?: boolean
  timestamp: number
}

export interface LoadingState {
  isLoading: boolean
  text: string
  progress?: number
}

export const useUIStore = defineStore('ui', () => {
  // 加载状态
  const loadingState = ref<LoadingState>({
    isLoading: false,
    text: '加载中...',
    progress: 0
  })

  // 通知列表
  const notifications = ref<NotificationItem[]>([])

  // 3D设置
  const threeDSettings = ref({
    enabled: true,
    quality: 'high', // 'low' | 'medium' | 'high'
    particles: true,
    animations: true,
    shadows: true,
    antialiasing: true
  })

  // 主题设置
  const theme = ref({
    mode: 'dark', // 'light' | 'dark' | 'auto'
    primaryColor: '#3b82f6',
    accentColor: '#8b5cf6'
  })

  // 用户偏好设置
  const preferences = ref({
    language: 'zh-CN',
    autoCleanup: true,
    showTips: true,
    soundEnabled: true,
    animationSpeed: 1.0,
    compactMode: false
  })

  // 窗口信息
  const viewport = ref({
    width: window.innerWidth,
    height: window.innerHeight,
    isMobile: window.innerWidth < 768,
    isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
    isDesktop: window.innerWidth >= 1024
  })

  // 计算属性
  const isLoading = computed(() => loadingState.value.isLoading)
  const loadingText = computed(() => loadingState.value.text)
  const loadingProgress = computed(() => loadingState.value.progress)
  
  const notificationCount = computed(() => notifications.value.length)
  
  const is3DEnabled = computed(() => 
    threeDSettings.value.enabled && (window as any).webglSupported
  )

  const isDarkMode = computed(() => {
    if (theme.value.mode === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return theme.value.mode === 'dark'
  })

  const isMobile = computed(() => viewport.value.isMobile)
  const isTablet = computed(() => viewport.value.isTablet)
  const isDesktop = computed(() => viewport.value.isDesktop)

  // Actions
  
  /**
   * 显示加载状态
   */
  const showLoading = (text: string = '加载中...', progress?: number) => {
    loadingState.value = {
      isLoading: true,
      text,
      progress
    }
  }

  /**
   * 隐藏加载状态
   */
  const hideLoading = () => {
    loadingState.value.isLoading = false
    loadingState.value.progress = 0
  }

  /**
   * 更新加载进度
   */
  const updateLoadingProgress = (progress: number, text?: string) => {
    loadingState.value.progress = progress
    if (text) {
      loadingState.value.text = text
    }
  }

  /**
   * 添加通知
   */
  const addNotification = (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const item: NotificationItem = {
      ...notification,
      id,
      timestamp: Date.now(),
      duration: notification.duration ?? 4500,
      showClose: notification.showClose ?? true
    }
    
    notifications.value.push(item)
    
    // 自动移除通知
    if (item.duration && item.duration > 0) {
      setTimeout(() => {
        removeNotification(id)
      }, item.duration)
    }
    
    return id
  }

  /**
   * 移除通知
   */
  const removeNotification = (id: string) => {
    const index = notifications.value.findIndex(n => n.id === id)
    if (index > -1) {
      notifications.value.splice(index, 1)
    }
  }

  /**
   * 清除所有通知
   */
  const clearNotifications = () => {
    notifications.value = []
  }

  /**
   * 显示成功消息
   */
  const showSuccess = (title: string, message: string = '', duration?: number) => {
    return addNotification({
      type: 'success',
      title,
      message,
      duration
    })
  }

  /**
   * 显示错误消息
   */
  const showError = (title: string, message: string = '', duration?: number) => {
    return addNotification({
      type: 'error',
      title,
      message,
      duration: duration ?? 6000 // 错误消息显示更久
    })
  }

  /**
   * 显示警告消息
   */
  const showWarning = (title: string, message: string = '', duration?: number) => {
    return addNotification({
      type: 'warning',
      title,
      message,
      duration
    })
  }

  /**
   * 显示信息消息
   */
  const showInfo = (title: string, message: string = '', duration?: number) => {
    return addNotification({
      type: 'info',
      title,
      message,
      duration
    })
  }

  /**
   * 更新3D设置
   */
  const update3DSettings = (settings: Partial<typeof threeDSettings.value>) => {
    threeDSettings.value = { ...threeDSettings.value, ...settings }
    
    // 保存到本地存储
    localStorage.setItem('threeDSettings', JSON.stringify(threeDSettings.value))
  }

  /**
   * 更新主题设置
   */
  const updateTheme = (themeSettings: Partial<typeof theme.value>) => {
    theme.value = { ...theme.value, ...themeSettings }
    
    // 应用主题到DOM
    applyTheme()
    
    // 保存到本地存储
    localStorage.setItem('theme', JSON.stringify(theme.value))
  }

  /**
   * 更新用户偏好
   */
  const updatePreferences = (prefs: Partial<typeof preferences.value>) => {
    preferences.value = { ...preferences.value, ...prefs }
    
    // 保存到本地存储
    localStorage.setItem('preferences', JSON.stringify(preferences.value))
  }

  /**
   * 更新视口信息
   */
  const updateViewport = () => {
    viewport.value = {
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: window.innerWidth < 768,
      isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
      isDesktop: window.innerWidth >= 1024
    }
  }

  /**
   * 应用主题到DOM
   */
  const applyTheme = () => {
    const root = document.documentElement
    
    if (isDarkMode.value) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    
    // 设置CSS变量
    root.style.setProperty('--primary-color', theme.value.primaryColor)
    root.style.setProperty('--accent-color', theme.value.accentColor)
  }

  /**
   * 从本地存储加载设置
   */
  const loadSettings = () => {
    try {
      // 加载3D设置
      const saved3DSettings = localStorage.getItem('threeDSettings')
      if (saved3DSettings) {
        threeDSettings.value = { ...threeDSettings.value, ...JSON.parse(saved3DSettings) }
      }
      
      // 加载主题设置
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        theme.value = { ...theme.value, ...JSON.parse(savedTheme) }
      }
      
      // 加载用户偏好
      const savedPreferences = localStorage.getItem('preferences')
      if (savedPreferences) {
        preferences.value = { ...preferences.value, ...JSON.parse(savedPreferences) }
      }
      
      // 应用主题
      applyTheme()
      
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }

  /**
   * 重置所有设置
   */
  const resetSettings = () => {
    // 清除本地存储
    localStorage.removeItem('threeDSettings')
    localStorage.removeItem('theme')
    localStorage.removeItem('preferences')
    
    // 重置到默认值
    threeDSettings.value = {
      enabled: true,
      quality: 'high',
      particles: true,
      animations: true,
      shadows: true,
      antialiasing: true
    }
    
    theme.value = {
      mode: 'dark',
      primaryColor: '#3b82f6',
      accentColor: '#8b5cf6'
    }
    
    preferences.value = {
      language: 'zh-CN',
      autoCleanup: true,
      showTips: true,
      soundEnabled: true,
      animationSpeed: 1.0,
      compactMode: false
    }
    
    // 应用主题
    applyTheme()
  }

  /**
   * 获取性能建议
   */
  const getPerformanceRecommendations = () => {
    const recommendations: string[] = []
    
    if (isMobile.value) {
      recommendations.push('移动设备建议降低3D质量以提升性能')
      if (threeDSettings.value.quality === 'high') {
        recommendations.push('建议将3D质量设置为中等或低等')
      }
    }
    
    if (threeDSettings.value.particles && threeDSettings.value.quality === 'high') {
      recommendations.push('高质量模式下建议关闭粒子效果以节省性能')
    }
    
    if (!navigator.hardwareConcurrency || navigator.hardwareConcurrency < 4) {
      recommendations.push('检测到CPU核心数较少，建议降低动画复杂度')
    }
    
    return recommendations
  }

  // 初始化
  loadSettings()
  
  // 监听窗口大小变化
  window.addEventListener('resize', updateViewport)
  
  // 监听系统主题变化
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (theme.value.mode === 'auto') {
        applyTheme()
      }
    })
  }

  return {
    // 状态
    loadingState,
    notifications,
    threeDSettings,
    theme,
    preferences,
    viewport,
    
    // 计算属性
    isLoading,
    loadingText,
    loadingProgress,
    notificationCount,
    is3DEnabled,
    isDarkMode,
    isMobile,
    isTablet,
    isDesktop,
    
    // Actions
    showLoading,
    hideLoading,
    updateLoadingProgress,
    addNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    update3DSettings,
    updateTheme,
    updatePreferences,
    updateViewport,
    loadSettings,
    resetSettings,
    getPerformanceRecommendations
  }
})
