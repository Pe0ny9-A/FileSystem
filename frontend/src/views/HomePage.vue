<template>
  <div class="home-page min-h-screen flex items-center justify-center">
    <div class="text-center space-y-8 max-w-4xl mx-auto px-4">
      <!-- 主标题 -->
      <div class="space-y-4 animate-fadeInUp">
        <h1 class="text-4xl md:text-6xl font-bold text-gradient-primary">
          文件管理系统
        </h1>
        <p class="text-xl md:text-2xl text-gray-300">
          基于取件码的现代化文件共享平台
        </p>
        <p class="text-gray-400 max-w-2xl mx-auto leading-relaxed">
          支持3D界面交互，无需登录即可实现文件的安全上传和下载，为企业提供高效便捷的文件传输解决方案
        </p>
      </div>

      <!-- 功能卡片 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 animate-fadeInUp">
        <!-- 上传文件卡片 -->
        <div class="feature-card group" @click="goToUpload">
          <div class="feature-icon bg-gradient-to-br from-blue-500 to-blue-600">
            <el-icon class="text-3xl text-white">
              <Upload />
            </el-icon>
          </div>
          <h3 class="text-xl font-semibold text-white mb-2">上传文件</h3>
          <p class="text-gray-400 mb-4">
            拖拽或选择文件上传，系统将生成6位取件码供他人下载
          </p>
          <div class="flex items-center text-blue-400 group-hover:text-blue-300 transition-colors">
            <span class="mr-2">开始上传</span>
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>

        <!-- 取件下载卡片 -->
        <div class="feature-card group" @click="goToPickup">
          <div class="feature-icon bg-gradient-to-br from-purple-500 to-purple-600">
            <el-icon class="text-3xl text-white">
              <Download />
            </el-icon>
          </div>
          <h3 class="text-xl font-semibold text-white mb-2">取件下载</h3>
          <p class="text-gray-400 mb-4">
            输入6位取件码即可验证并下载对应的文件
          </p>
          <div class="flex items-center text-purple-400 group-hover:text-purple-300 transition-colors">
            <span class="mr-2">立即取件</span>
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>
      </div>

      <!-- 特性介绍 -->
      <div class="mt-16 animate-fadeInUp">
        <h2 class="text-2xl font-bold text-white mb-8">系统特色</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="feature-highlight">
            <el-icon class="text-2xl text-green-400 mb-3"><Lock /></el-icon>
            <h4 class="font-semibold text-white mb-2">安全可靠</h4>
            <p class="text-gray-400 text-sm">
              文件自动过期，支持多种文件类型验证，确保数据安全
            </p>
          </div>
          
          <div class="feature-highlight">
            <el-icon class="text-2xl text-blue-400 mb-3"><View /></el-icon>
            <h4 class="font-semibold text-white mb-2">3D界面</h4>
            <p class="text-gray-400 text-sm">
              现代化3D交互界面，提供沉浸式的用户体验
            </p>
          </div>
          
          <div class="feature-highlight">
            <el-icon class="text-2xl text-yellow-400 mb-3"><Lightning /></el-icon>
            <h4 class="font-semibold text-white mb-2">快速便捷</h4>
            <p class="text-gray-400 text-sm">
              无需登录注册，一键上传下载，简化操作流程
            </p>
          </div>
        </div>
      </div>

      <!-- 使用统计 -->
      <div v-if="stats" class="mt-16 animate-fadeInUp">
        <div class="glass rounded-xl p-6">
          <h3 class="text-lg font-semibold text-white mb-4">实时统计</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-400">{{ stats.files.activeFiles }}</div>
              <div class="text-sm text-gray-400">活跃文件</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-green-400">{{ stats.files.formattedSize }}</div>
              <div class="text-sm text-gray-400">存储使用</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-purple-400">{{ stats.codes.activeCodes }}</div>
              <div class="text-sm text-gray-400">活跃取件码</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-yellow-400">{{ stats.codes.usageRate }}</div>
              <div class="text-sm text-gray-400">使用率</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Upload, 
  Download, 
  ArrowRight, 
  Lock, 
  View, 
  Lightning 
} from '@element-plus/icons-vue'
import { apiClient, type SystemStats } from '@/utils/api'
import { useUIStore } from '@/stores/uiStore'

// 路由和状态
const router = useRouter()
const uiStore = useUIStore()

// 响应式数据
const stats = ref<SystemStats | null>(null)

// 生命周期
onMounted(async () => {
  try {
    // 获取系统统计信息
    stats.value = await apiClient.getSystemStats()
  } catch (error) {
    console.error('获取统计信息失败:', error)
  }
})

// 方法
const goToUpload = () => {
  router.push('/upload')
}

const goToPickup = () => {
  router.push('/pickup')
}
</script>

<style scoped>
.home-page {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
}

.feature-card {
  @apply bg-gray-800 bg-opacity-50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl hover:bg-opacity-60;
}

.feature-icon {
  @apply w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto;
}

.feature-highlight {
  @apply text-center p-4;
}

.text-gradient-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 动画延迟 */
.feature-card:nth-child(1) {
  animation-delay: 0.1s;
}

.feature-card:nth-child(2) {
  animation-delay: 0.2s;
}

.feature-highlight:nth-child(1) {
  animation-delay: 0.1s;
}

.feature-highlight:nth-child(2) {
  animation-delay: 0.2s;
}

.feature-highlight:nth-child(3) {
  animation-delay: 0.3s;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .text-4xl.md\\:text-6xl {
    @apply text-3xl;
  }
  
  .text-xl.md\\:text-2xl {
    @apply text-lg;
  }
}
</style>
