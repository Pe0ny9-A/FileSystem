<template>
  <footer class="relative z-40 mt-auto bg-black bg-opacity-20 backdrop-blur-md border-t border-gray-700">
    <div class="container mx-auto px-4 py-8">
      <div class="footer-grid grid grid-cols-1 md:grid-cols-4 gap-8">
        <!-- 公司信息 -->
        <div class="footer-main-section col-span-1 md:col-span-2">
          <div class="flex items-center space-x-3 mb-4">
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <el-icon class="text-white text-lg">
                <FolderOpened />
              </el-icon>
            </div>
            <h3 class="text-lg font-bold text-white">文件管理系统</h3>
          </div>
          <p class="text-gray-400 text-sm mb-4 leading-relaxed">
            基于取件码的现代化文件共享平台，支持3D界面交互，为企业提供安全、高效的文件传输解决方案。
          </p>
          <div class="flex items-center space-x-4">
            <div class="flex items-center text-xs text-gray-500">
              <el-icon class="mr-1"><Clock /></el-icon>
              运行时间: {{ formatUptime(systemStatus?.uptime || 0) }}
            </div>
            <div class="flex items-center text-xs text-gray-500">
              <el-icon class="mr-1"><Monitor /></el-icon>
              状态: 
              <span class="ml-1 text-green-400">正常</span>
            </div>
          </div>
        </div>

        <!-- 功能链接 -->
        <div>
          <h4 class="text-white font-semibold mb-4">功能导航</h4>
          <ul class="space-y-2">
            <li>
              <router-link to="/upload" class="footer-link">
                <el-icon class="mr-1"><Upload /></el-icon>
                文件上传
              </router-link>
            </li>
            <li>
              <router-link to="/pickup" class="footer-link">
                <el-icon class="mr-1"><Download /></el-icon>
                取件下载
              </router-link>
            </li>
            <li>
              <a href="/api/docs" class="footer-link" target="_blank">
                <el-icon class="mr-1"><Document /></el-icon>
                API文档
              </a>
            </li>
            <li>
              <a @click="showStats" class="footer-link cursor-pointer">
                <el-icon class="mr-1"><DataAnalysis /></el-icon>
                系统统计
              </a>
            </li>
          </ul>
        </div>

        <!-- 帮助信息 -->
        <div>
          <h4 class="text-white font-semibold mb-4">帮助支持</h4>
          <ul class="space-y-2">
            <li>
              <a @click="showHelp" class="footer-link cursor-pointer">
                <el-icon class="mr-1"><QuestionFilled /></el-icon>
                使用帮助
              </a>
            </li>
            <li>
              <a @click="showAbout" class="footer-link cursor-pointer">
                <el-icon class="mr-1"><InfoFilled /></el-icon>
                关于系统
              </a>
            </li>
            <li>
              <a href="mailto:support@company.com" class="footer-link">
                <el-icon class="mr-1"><Message /></el-icon>
                联系支持
              </a>
            </li>
            <li>
              <a @click="showSettings" class="footer-link cursor-pointer">
                <el-icon class="mr-1"><Setting /></el-icon>
                系统设置
              </a>
            </li>
          </ul>
        </div>
      </div>

      <!-- 底部版权信息 -->
      <div class="mt-8 pt-6 border-t border-gray-700">
        <div class="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div class="text-sm text-gray-400">
            © 2025 公司文件管理系统. 版本 {{ version }} | 
            <span class="text-gray-500">技术支持: Pe0ny9</span>
          </div>
          
          <div class="flex items-center space-x-6 text-sm text-gray-400">
            <span>支持的文件类型: {{ supportedTypes }}</span>
            <span>最大文件大小: 50MB</span>
            <span>文件保存: 7天</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 系统统计对话框 -->
    <el-dialog
      v-model="statsVisible"
      title="系统统计信息"
      width="600px"
      align-center
    >
      <div v-if="statsData" class="space-y-6">
        <!-- 文件统计 -->
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-blue-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">{{ statsData.files.activeFiles }}</div>
            <div class="text-sm text-gray-600">活跃文件</div>
          </div>
          <div class="bg-green-50 p-4 rounded-lg">
            <div class="text-2xl font-bold text-green-600">{{ statsData.files.formattedSize }}</div>
            <div class="text-sm text-gray-600">存储使用</div>
          </div>
        </div>

        <!-- 取件码统计 -->
        <div class="grid grid-cols-3 gap-4">
          <div class="text-center">
            <div class="text-lg font-semibold">{{ statsData.codes.totalCodes }}</div>
            <div class="text-xs text-gray-500">总取件码</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold">{{ statsData.codes.activeCodes }}</div>
            <div class="text-xs text-gray-500">活跃取件码</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-semibold">{{ statsData.codes.usageRate }}</div>
            <div class="text-xs text-gray-500">使用率</div>
          </div>
        </div>

        <!-- 系统信息 -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="font-semibold mb-2">系统信息</h4>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div>运行时间: {{ formatUptime(statsData.system.uptime) }}</div>
            <div>系统版本: {{ statsData.system.version }}</div>
            <div>内存使用: {{ formatMemory(statsData.system.memory.heapUsed) }}</div>
            <div>内存总量: {{ formatMemory(statsData.system.memory.heapTotal) }}</div>
          </div>
        </div>
      </div>
      
      <div v-else class="text-center py-8">
        <el-icon class="text-4xl text-gray-400 mb-2"><Loading /></el-icon>
        <p class="text-gray-500">加载统计信息中...</p>
      </div>
    </el-dialog>
  </footer>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { 
  FolderOpened, 
  Upload, 
  Download, 
  Document, 
  DataAnalysis,
  QuestionFilled,
  InfoFilled,
  Message,
  Setting,
  Clock,
  Monitor,
  Loading
} from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useUIStore } from '@/stores/uiStore'
import { apiClient, type SystemStats } from '@/utils/api'

// 状态管理
const uiStore = useUIStore()

// 响应式数据
const statsVisible = ref(false)
const statsData = ref<SystemStats | null>(null)
const systemStatus = ref<any>(null)
const version = ref('1.0.0')
const supportedTypes = ref('图片, 文档, 压缩包等')

// 生命周期
onMounted(async () => {
  try {
    // 获取系统状态
    systemStatus.value = await apiClient.getSystemStatus()
  } catch (error) {
    console.error('获取系统状态失败:', error)
  }
})

// 方法
const showStats = async () => {
  statsVisible.value = true
  statsData.value = null
  
  try {
    statsData.value = await apiClient.getSystemStats()
  } catch (error) {
    console.error('获取统计信息失败:', error)
    uiStore.showError('获取统计信息失败', '请稍后重试')
  }
}

const showHelp = () => {
  ElMessageBox.alert(`
    <div style="text-align: left; line-height: 1.6;">
      <h3 style="margin-bottom: 16px;">使用说明</h3>
      
      <h4 style="color: #409EFF; margin: 12px 0 8px 0;">📤 文件上传</h4>
      <p style="margin: 4px 0;">1. 点击"上传文件"或拖拽文件到上传区域</p>
      <p style="margin: 4px 0;">2. 系统会生成6位取件码</p>
      <p style="margin: 4px 0;">3. 将取件码分享给需要下载的人员</p>
      
      <h4 style="color: #409EFF; margin: 12px 0 8px 0;">📥 文件下载</h4>
      <p style="margin: 4px 0;">1. 输入6位取件码</p>
      <p style="margin: 4px 0;">2. 系统验证取件码有效性</p>
      <p style="margin: 4px 0;">3. 点击下载按钮获取文件</p>
      
      <h4 style="color: #409EFF; margin: 12px 0 8px 0;">⚠️ 注意事项</h4>
      <p style="margin: 4px 0;">• 文件最大50MB，保存7天</p>
      <p style="margin: 4px 0;">• 支持图片、文档、压缩包等格式</p>
      <p style="margin: 4px 0;">• 取件码区分大小写</p>
    </div>
  `, '使用帮助', {
    dangerouslyUseHTMLString: true,
    confirmButtonText: '我知道了'
  })
}

const showAbout = () => {
  ElMessageBox.alert(`
    <div style="text-align: center;">
      <h3 style="margin-bottom: 16px;">关于系统</h3>
      <p style="margin: 8px 0;">公司文件管理系统 v${version.value}</p>
      <p style="margin: 8px 0;">基于Vue3 + Three.js + Node.js构建</p>
      <p style="margin: 8px 0;">支持3D界面交互的现代化文件共享平台</p>
      <p style="margin: 16px 0; color: #666;">技术支持: Pe0ny9</p>
    </div>
  `, '关于系统', {
    dangerouslyUseHTMLString: true,
    confirmButtonText: '确定'
  })
}

const showSettings = () => {
  uiStore.showInfo('系统设置', '设置功能开发中，敬请期待')
}

const formatUptime = (seconds: number): string => {
  if (!seconds) return '0秒'
  
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  let result = ''
  if (days > 0) result += `${days}天 `
  if (hours > 0) result += `${hours}小时 `
  if (minutes > 0) result += `${minutes}分钟 `
  if (secs > 0 || result === '') result += `${secs}秒`
  
  return result.trim()
}

const formatMemory = (bytes: number): string => {
  const mb = Math.round(bytes / 1024 / 1024)
  return `${mb}MB`
}
</script>

<style scoped>
.footer-link {
  @apply flex items-center text-sm text-gray-400 hover:text-white transition-colors duration-200;
}

.footer-link:hover {
  @apply text-blue-400;
}

/* 玻璃态效果 */
footer {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .footer-grid {
    @apply grid-cols-1 gap-4;
  }
  
  .footer-main-section {
    @apply col-span-1;
  }
}
</style>
