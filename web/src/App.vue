<template>
  <div id="app" class="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
    <!-- 3D背景容器 -->
    <div 
      ref="backgroundContainer" 
      class="fixed inset-0 z-0"
      :class="{ 'opacity-50': !webglSupported }"
    ></div>
    
    <!-- 主要内容区域 -->
    <div class="relative z-10">
      <!-- 导航栏 -->
      <AppHeader />
      
      <!-- 路由视图 -->
      <main class="container mx-auto px-4 py-8">
        <router-view v-slot="{ Component, route }">
          <transition
            :name="route.meta?.transition || 'fade'"
            mode="out-in"
            appear
          >
            <component :is="Component" :key="route.path" />
          </transition>
        </router-view>
      </main>
      
      <!-- 页脚 -->
      <AppFooter />
    </div>
    
    <!-- 全局通知容器 -->
    <NotificationContainer />
    
    <!-- WebGL不支持警告 -->
    <div 
      v-if="!webglSupported" 
      class="fixed bottom-4 right-4 z-50 max-w-sm"
    >
      <el-alert
        title="3D功能不可用"
        type="warning"
        :closable="false"
        show-icon
      >
        <template #default>
          您的浏览器不支持WebGL，3D视觉效果将被禁用。建议使用现代浏览器以获得最佳体验。
        </template>
      </el-alert>
    </div>
    
    <!-- 加载遮罩 -->
    <div 
      v-if="isLoading" 
      class="fixed inset-0 z-100 bg-black bg-opacity-50 flex items-center justify-center"
    >
      <div class="bg-white rounded-lg p-8 flex flex-col items-center space-y-4">
        <el-icon class="animate-spin text-4xl text-primary-500">
          <Loading />
        </el-icon>
        <p class="text-lg font-medium text-gray-700">{{ loadingText }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Loading } from '@element-plus/icons-vue'

import AppHeader from '@/components/Layout/AppHeader.vue'
import AppFooter from '@/components/Layout/AppFooter.vue'
import NotificationContainer from '@/components/UI/NotificationContainer.vue'

import { useUIStore } from '@/stores/uiStore'
import { use3DBackground } from '@/composables/use3DBackground'

// 响应式数据
const backgroundContainer = ref<HTMLElement>()
const webglSupported = ref((window as any).webglSupported ?? true)

// 状态管理
const uiStore = useUIStore()
const { isLoading, loadingText } = storeToRefs(uiStore)

// 路由
const router = useRouter()

// 3D背景场景
const { initBackground, destroyBackground, updateBackground } = use3DBackground()

// 提供全局配置
provide('webglSupported', webglSupported.value)
provide('isMobile', /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))

// 生命周期
onMounted(async () => {
  try {
    // 初始化3D背景
    if (webglSupported.value && backgroundContainer.value) {
      await initBackground(backgroundContainer.value)
      
      // 启动背景动画循环
      startBackgroundAnimation()
    }
    
    // 监听路由变化
    router.afterEach((to) => {
      // 更新页面标题
      document.title = to.meta?.title 
        ? `${to.meta.title} - 公司文件管理系统`
        : '公司文件管理系统'
      
      // 更新3D背景主题
      if (webglSupported.value) {
        updateBackgroundTheme(to.name as string)
      }
    })
    
    // 监听窗口大小变化
    window.addEventListener('resize', handleResize)
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    console.log('✅ 应用初始化完成')
    
  } catch (error) {
    console.error('❌ 应用初始化失败:', error)
    ElMessage.error('应用初始化失败，请刷新页面重试')
  }
})

onUnmounted(() => {
  // 清理3D背景
  destroyBackground()
  
  // 移除事件监听器
  window.removeEventListener('resize', handleResize)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  
  // 停止动画循环
  stopBackgroundAnimation()
})

// 背景动画循环
let animationId: number | null = null

const startBackgroundAnimation = () => {
  const animate = () => {
    if (webglSupported.value && document.visibilityState === 'visible') {
      updateBackground()
    }
    animationId = requestAnimationFrame(animate)
  }
  animate()
}

const stopBackgroundAnimation = () => {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

// 事件处理
const handleResize = () => {
  if (webglSupported.value && backgroundContainer.value) {
    // 3D场景自适应窗口大小
    const { width, height } = backgroundContainer.value.getBoundingClientRect()
    // 触发3D场景大小更新
    updateBackground({ width, height })
  }
}

const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    // 页面不可见时停止动画以节省性能
    stopBackgroundAnimation()
  } else {
    // 页面可见时恢复动画
    if (webglSupported.value) {
      startBackgroundAnimation()
    }
  }
}

// 更新3D背景主题
const updateBackgroundTheme = (routeName: string) => {
  const themes = {
    'home': 'default',
    'upload': 'upload',
    'pickup': 'pickup',
    'about': 'about'
  }
  
  const theme = themes[routeName as keyof typeof themes] || 'default'
  updateBackground({ theme })
}
</script>

<style scoped>
/* 页面过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(50px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(-50px);
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}

.slide-right-enter-from {
  opacity: 0;
  transform: translateX(-50px);
}

.slide-right-leave-to {
  opacity: 0;
  transform: translateX(50px);
}

/* 3D背景容器样式 */
#app {
  position: relative;
  overflow-x: hidden;
}

/* 确保3D canvas不会阻挡交互 */
:deep(canvas) {
  pointer-events: none;
}

/* 响应式设计 */
@media (max-width: 768px) {
  main {
    padding: 1rem;
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  #app {
    background: #000;
    color: #fff;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active,
  .slide-left-enter-active,
  .slide-left-leave-active,
  .slide-right-enter-active,
  .slide-right-leave-active {
    transition: none;
  }
  
  .fade-enter-from,
  .fade-leave-to,
  .slide-left-enter-from,
  .slide-left-leave-to,
  .slide-right-enter-from,
  .slide-right-leave-to {
    transform: none;
  }
}
</style>
