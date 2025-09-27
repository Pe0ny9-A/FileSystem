<template>
  <div class="pickup-page min-h-screen py-8">
    <div class="container mx-auto px-4 max-w-2xl">
      <!-- 页面标题 -->
      <div class="text-center mb-8 animate-fadeInUp">
        <h1 class="text-3xl md:text-4xl font-bold text-white mb-4">
          取件下载
        </h1>
        <p class="text-gray-400 text-lg">
          输入6位取件码验证并下载文件
        </p>
      </div>

      <!-- 取件码输入区域 -->
      <div class="pickup-container animate-fadeInUp">
        <div class="glass rounded-xl p-8">
          <!-- 取件码输入 -->
          <div v-if="!fileInfo" class="text-center">
            <div class="mb-6">
              <el-icon class="text-6xl text-purple-400 mb-4">
                <Key />
              </el-icon>
              <h3 class="text-xl font-semibold text-white mb-2">
                请输入取件码
              </h3>
              <p class="text-gray-400">
                取件码由6位大写字母和数字组成
              </p>
            </div>

            <!-- 取件码输入框 -->
            <div class="pickup-code-input mb-6">
              <el-input
                v-model="pickupCode"
                placeholder="输入6位取件码"
                size="large"
                maxlength="6"
                class="pickup-input"
                :class="{ 'error': hasError }"
                @input="handleCodeInput"
                @keyup.enter="verifyCode"
              >
                <template #prefix>
                  <el-icon><Ticket /></el-icon>
                </template>
              </el-input>
              <div v-if="hasError" class="error-message">
                {{ errorMessage }}
              </div>
            </div>

            <!-- 验证按钮 -->
            <el-button
              type="primary"
              size="large"
              :loading="isVerifying"
              :disabled="!isCodeValid"
              @click="verifyCode"
              class="verify-button"
            >
              <el-icon v-if="!isVerifying" class="mr-2"><Search /></el-icon>
              {{ isVerifying ? '验证中...' : '验证取件码' }}
            </el-button>

            <!-- 取件码格式提示 -->
            <div class="mt-6 text-sm text-gray-500">
              <p>💡 取件码格式：6位大写字母和数字组合，如：ABC123</p>
              <p>📅 文件保存期限：7天，过期后将自动删除</p>
            </div>
          </div>

          <!-- 文件信息展示 -->
          <div v-if="fileInfo" class="file-info-section">
            <!-- 成功图标 -->
            <div class="text-center mb-6">
              <el-icon class="text-6xl text-green-400 mb-4">
                <CircleCheck />
              </el-icon>
              <h3 class="text-xl font-semibold text-white mb-2">
                验证成功！
              </h3>
              <p class="text-gray-400">
                找到了您要的文件
              </p>
            </div>

            <!-- 文件详情卡片 -->
            <div class="file-details glass rounded-lg p-6 mb-6">
              <div class="flex items-start space-x-4">
                <!-- 文件图标 -->
                <div class="file-icon">
                  <el-icon class="text-3xl text-blue-400">
                    <Document />
                  </el-icon>
                </div>

                <!-- 文件信息 -->
                <div class="flex-1">
                  <h4 class="text-lg font-semibold text-white mb-2">
                    {{ fileInfo.name }}
                  </h4>
                  
                  <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span class="text-gray-400">文件大小:</span>
                      <span class="text-white ml-2">{{ fileInfo.formattedSize }}</span>
                    </div>
                    <div>
                      <span class="text-gray-400">上传时间:</span>
                      <span class="text-white ml-2">{{ formatTime(fileInfo.uploadTime) }}</span>
                    </div>
                    <div>
                      <span class="text-gray-400">剩余时间:</span>
                      <span class="text-white ml-2">{{ fileInfo.timeRemaining }}</span>
                    </div>
                    <div>
                      <span class="text-gray-400">下载次数:</span>
                      <span class="text-white ml-2">{{ fileInfo.downloadCount }}</span>
                    </div>
                  </div>

                  <!-- 文件描述 -->
                  <div v-if="fileInfo.description" class="mt-4">
                    <span class="text-gray-400">描述:</span>
                    <p class="text-white mt-1">{{ fileInfo.description }}</p>
                  </div>

                  <!-- 文件标签 -->
                  <div v-if="fileInfo.tags" class="mt-4">
                    <span class="text-gray-400">标签:</span>
                    <div class="flex flex-wrap gap-2 mt-1">
                      <el-tag 
                        v-for="tag in parseTags(fileInfo.tags)" 
                        :key="tag"
                        size="small"
                        type="info"
                      >
                        {{ tag }}
                      </el-tag>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 下载操作 -->
            <div class="download-actions">
              <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <el-button
                  type="primary"
                  size="large"
                  :loading="isDownloading"
                  @click="downloadFile"
                  class="download-button"
                >
                  <el-icon v-if="!isDownloading" class="mr-2"><Download /></el-icon>
                  {{ isDownloading ? '准备下载...' : '下载文件' }}
                </el-button>
                
                <el-button
                  size="large"
                  @click="resetPickup"
                >
                  <el-icon class="mr-2"><RefreshLeft /></el-icon>
                  重新输入
                </el-button>
              </div>

              <!-- 下载提示 -->
              <div class="mt-4 text-center text-sm text-gray-500">
                <p>🔒 下载链接仅在当前会话有效，请及时保存文件</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 最近取件记录 -->
      <div v-if="recentCodes.length > 0" class="recent-codes mt-8 animate-fadeInUp">
        <div class="glass rounded-lg p-6">
          <h4 class="text-lg font-semibold text-white mb-4">最近使用的取件码</h4>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              v-for="code in recentCodes"
              :key="code"
              @click="useRecentCode(code)"
              class="recent-code-item"
            >
              {{ code }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { 
  Key, 
  Ticket, 
  Search, 
  CircleCheck, 
  Document, 
  Download, 
  RefreshLeft 
} from '@element-plus/icons-vue'
import { apiClient, apiUtils, type FileInfo } from '@/utils/api'
import { useUIStore } from '@/stores/uiStore'

// 路由和状态
const route = useRoute()
const uiStore = useUIStore()

// 响应式数据
const pickupCode = ref('')
const fileInfo = ref<FileInfo | null>(null)
const isVerifying = ref(false)
const isDownloading = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const recentCodes = ref<string[]>([])

// 计算属性
const isCodeValid = computed(() => {
  return apiUtils.validatePickupCode(pickupCode.value)
})

// 生命周期
onMounted(() => {
  // 从URL参数获取取件码
  const codeFromUrl = route.query.code as string
  if (codeFromUrl && apiUtils.validatePickupCode(codeFromUrl)) {
    pickupCode.value = codeFromUrl.toUpperCase()
    verifyCode()
  }
  
  // 加载最近使用的取件码
  loadRecentCodes()
})

// 监听取件码输入
watch(pickupCode, () => {
  hasError.value = false
  errorMessage.value = ''
})

// 方法
const handleCodeInput = (value: string) => {
  // 转换为大写
  pickupCode.value = value.toUpperCase()
}

const verifyCode = async () => {
  if (!isCodeValid.value) {
    hasError.value = true
    errorMessage.value = '请输入有效的6位取件码'
    return
  }
  
  try {
    isVerifying.value = true
    hasError.value = false
    
    const result = await apiClient.verifyPickupCode(pickupCode.value)
    fileInfo.value = result
    
    // 保存到最近使用记录
    saveRecentCode(pickupCode.value)
    
    uiStore.showSuccess('验证成功', '文件信息已获取')
    
  } catch (error: any) {
    console.error('验证失败:', error)
    hasError.value = true
    
    if (error.message.includes('过期')) {
      errorMessage.value = '取件码已过期'
    } else if (error.message.includes('不存在')) {
      errorMessage.value = '取件码不存在或无效'
    } else {
      errorMessage.value = '验证失败，请检查取件码'
    }
    
    uiStore.showError('验证失败', errorMessage.value)
  } finally {
    isVerifying.value = false
  }
}

const downloadFile = async () => {
  if (!fileInfo.value) return
  
  try {
    isDownloading.value = true
    
    // 获取下载链接
    const downloadUrl = apiClient.getDownloadUrl(pickupCode.value)
    
    // 创建下载链接
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = fileInfo.value.name
    link.target = '_blank'
    
    // 触发下载
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    uiStore.showSuccess('下载开始', '文件下载已开始')
    
    // 更新下载次数显示
    fileInfo.value.downloadCount += 1
    
  } catch (error: any) {
    console.error('下载失败:', error)
    uiStore.showError('下载失败', error.message || '请稍后重试')
  } finally {
    isDownloading.value = false
  }
}

const resetPickup = () => {
  pickupCode.value = ''
  fileInfo.value = null
  hasError.value = false
  errorMessage.value = ''
}

const useRecentCode = (code: string) => {
  pickupCode.value = code
  verifyCode()
}

const loadRecentCodes = () => {
  try {
    const saved = localStorage.getItem('recentPickupCodes')
    if (saved) {
      recentCodes.value = JSON.parse(saved)
    }
  } catch (error) {
    console.error('加载最近取件码失败:', error)
  }
}

const saveRecentCode = (code: string) => {
  try {
    const codes = recentCodes.value.filter(c => c !== code)
    codes.unshift(code)
    recentCodes.value = codes.slice(0, 6) // 只保留最近6个
    
    localStorage.setItem('recentPickupCodes', JSON.stringify(recentCodes.value))
  } catch (error) {
    console.error('保存最近取件码失败:', error)
  }
}

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const parseTags = (tags: string): string[] => {
  return tags.split(',').map(tag => tag.trim()).filter(tag => tag)
}
</script>

<style scoped>
.pickup-input {
  @apply text-center text-2xl font-mono;
}

.pickup-input :deep(.el-input__inner) {
  @apply text-center text-2xl font-mono tracking-wider;
}

.pickup-input.error :deep(.el-input__inner) {
  @apply border-red-500;
}

.error-message {
  @apply text-red-400 text-sm mt-2;
}

.verify-button {
  @apply w-full sm:w-auto min-w-40;
}

.file-details {
  @apply bg-gray-700 bg-opacity-30;
}

.file-icon {
  @apply w-12 h-12 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center;
}

.download-button {
  @apply min-w-40;
}

.recent-code-item {
  @apply bg-gray-700 bg-opacity-50 hover:bg-opacity-70 text-white font-mono text-sm py-2 px-3 rounded transition-all duration-200 border border-gray-600 hover:border-gray-500;
}

/* 动画延迟 */
.pickup-container {
  animation-delay: 0.2s;
}

.recent-codes {
  animation-delay: 0.4s;
}

/* 响应式调整 */
@media (max-width: 640px) {
  .pickup-input :deep(.el-input__inner) {
    @apply text-xl;
  }
  
  .file-details {
    @apply p-4;
  }
  
  .grid.grid-cols-2 {
    @apply grid-cols-1;
  }
}
</style>
