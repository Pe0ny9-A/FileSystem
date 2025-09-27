import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'

// 样式导入
import 'element-plus/dist/index.css'
import './assets/styles/main.css'

// 创建应用实例
const app = createApp(App)

// 使用Pinia状态管理
app.use(createPinia())

// 使用Vue Router
app.use(router)

// 使用Element Plus
app.use(ElementPlus)

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
  console.error('全局错误:', err)
  console.error('错误信息:', info)
  console.error('组件实例:', instance)
  
  // 可以在这里发送错误报告到服务器
  // reportError(err, info)
}

// 全局警告处理
app.config.warnHandler = (msg, instance, trace) => {
  console.warn('全局警告:', msg)
  console.warn('组件实例:', instance)
  console.warn('组件追踪:', trace)
}

// 全局属性
app.config.globalProperties.$ELEMENT = {
  size: 'default',
  zIndex: 3000
}

// 开发环境下的调试工具
if (import.meta.env.DEV) {
  app.config.performance = true
  
  // 添加全局调试方法
  window.__VUE_APP__ = app
  
  console.log('🚀 开发模式启动')
  console.log('📦 Vue版本:', app.version)
  console.log('🌐 WebGL支持:', window.webglSupported)
}

// 挂载应用
app.mount('#app')

// 性能监控
if ('performance' in window) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      console.log('⚡ 页面性能指标:')
      console.log(`  - DNS查询: ${(perfData.domainLookupEnd - perfData.domainLookupStart).toFixed(2)}ms`)
      console.log(`  - TCP连接: ${(perfData.connectEnd - perfData.connectStart).toFixed(2)}ms`)
      console.log(`  - 页面加载: ${(perfData.loadEventEnd - perfData.navigationStart).toFixed(2)}ms`)
      console.log(`  - DOM就绪: ${(perfData.domContentLoadedEventEnd - perfData.navigationStart).toFixed(2)}ms`)
    }, 0)
  })
}
