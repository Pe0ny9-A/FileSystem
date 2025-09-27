<template>
  <div class="upload-page min-h-screen py-8">
    <div class="container mx-auto px-4 max-w-4xl">
      <!-- 页面标题 -->
      <div class="text-center mb-8 animate-fadeInUp">
        <h1 class="text-3xl md:text-4xl font-bold text-white mb-4">
          文件上传
        </h1>
        <p class="text-gray-400 text-lg">
          上传文件并获取取件码，支持最大50MB的文件
        </p>
      </div>

      <!-- 3D文件上传区域 -->
      <div class="upload-container animate-fadeInUp">
        <div v-if="!uploadResult" class="mb-6">
          <FileUploadCube
            ref="uploadCubeRef"
            :disabled="isUploading"
            @file-selected="handleFileSelected"
            @upload-progress="handleUploadProgress"
            @upload-success="handleUploadSuccess"
            @upload-error="handleUploadError"
          />
        </div>

        <!-- 3D取件码展示 -->
        <div v-if="uploadResult" class="mb-6">
          <PickupCodeCard
            :pickup-code="uploadResult.pickupCode"
            :file-info="{
              originalName: uploadResult.originalName,
              size: uploadResult.size,
              formattedSize: uploadResult.formattedSize,
              expiresIn: formatTimeRemaining(uploadResult.expiresAt - Date.now()),
              expiresAt: uploadResult.expiresAt
            }"
            theme="success"
            @share-code="sharePickupCode"
            @download-qr="downloadQR"
          />
          
          <!-- 操作按钮 -->
          <div class="flex justify-center space-x-4 mt-6">
            <el-button @click="resetUpload" size="large">
              <el-icon class="mr-1"><Upload /></el-icon>
              继续上传
            </el-button>
            <el-button @click="goToPickup" size="large" type="primary">
              <el-icon class="mr-1"><Share /></el-icon>
              去取件页面
            </el-button>
          </div>
        </div>

        <!-- 上传选项 -->
        <div v-if="!isUploading && !uploadResult" class="mt-6 animate-fadeInUp">
          <div class="glass rounded-lg p-6">
            <h4 class="text-lg font-semibold text-white mb-4">上传选项</h4>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- 文件描述 -->
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  文件描述 (可选)
                </label>
                <el-input
                  v-model="fileDescription"
                  placeholder="输入文件描述..."
                  maxlength="200"
                  show-word-limit
                  type="textarea"
                  :rows="3"
                />
              </div>

              <!-- 过期设置 -->
              <div>
                <label class="block text-sm font-medium text-gray-300 mb-2">
                  过期时间
                </label>
                <el-select v-model="expiryDays" class="w-full">
                  <el-option label="1天" :value="1" />
                  <el-option label="3天" :value="3" />
                  <el-option label="7天 (推荐)" :value="7" />
                  <el-option label="15天" :value="15" />
                  <el-option label="30天" :value="30" />
                </el-select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Upload, 
  Loading, 
  CircleCheck, 
  DocumentCopy, 
  Share 
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { apiClient, apiUtils, type UploadResponse } from '@/utils/api'
import { useUIStore } from '@/stores/uiStore'
import FileUploadCube from '@/components/3D/FileUploadCube.vue'
import PickupCodeCard from '@/components/3D/PickupCodeCard.vue'

// 路由和状态
const router = useRouter()
const uiStore = useUIStore()

// DOM引用
const uploadCubeRef = ref<InstanceType<typeof FileUploadCube>>()

// 响应式数据
const isUploading = ref(false)
const uploadProgress = ref(0)
const selectedFile = ref<File | null>(null)
const uploadResult = ref<UploadResponse | null>(null)
const fileDescription = ref('')
const expiryDays = ref(7)

// 计算属性
const progressColor = computed(() => {
  if (uploadProgress.value < 30) return '#f56565'
  if (uploadProgress.value < 70) return '#ed8936'
  return '#48bb78'
})

// 3D组件事件处理方法
const handleFileSelected = async (file: File) => {
  // 验证文件
  if (!validateFile(file)) {
    return
  }
  
  selectedFile.value = file
  await uploadFile(file)
}

const handleUploadProgress = (progress: number) => {
  uploadProgress.value = progress
}

const handleUploadSuccess = (result: any) => {
  uploadResult.value = result
}

const handleUploadError = (error: string) => {
  uiStore.showError('上传失败', error)
}

const validateFile = (file: File): boolean => {
  // 文件大小验证
  if (!apiUtils.validateFileSize(file)) {
    uiStore.showError('文件过大', '文件大小不能超过50MB')
    return false
  }
  
  // 文件类型验证 (可选，如果需要限制特定类型)
  // const allowedTypes = ['.jpg', '.png', '.pdf', '.doc', '.docx']
  // if (!apiUtils.validateFileType(file, allowedTypes)) {
  //   uiStore.showError('文件类型不支持', '请选择支持的文件格式')
  //   return false
  // }
  
  return true
}

const uploadFile = async (file: File) => {
  try {
    isUploading.value = true
    uploadProgress.value = 0
    
    // 通知3D组件开始上传
    uploadCubeRef.value?.startUpload()
    
    const result = await apiClient.uploadFile(file, {
      description: fileDescription.value,
      expiryDays: expiryDays.value,
      onProgress: (progress) => {
        uploadProgress.value = progress
        uploadCubeRef.value?.updateProgress(progress)
      }
    })
    
    uploadResult.value = result
    
    // 通知3D组件上传完成
    uploadCubeRef.value?.finishUpload()
    
    uiStore.showSuccess('上传成功', `取件码: ${result.pickupCode}`)
    
  } catch (error: any) {
    console.error('文件上传失败:', error)
    
    // 重置3D组件状态
    uploadCubeRef.value?.resetUpload()
    
    uiStore.showError('上传失败', error.message || '请稍后重试')
  } finally {
    isUploading.value = false
  }
}

const copyPickupCode = async () => {
  if (!uploadResult.value) return
  
  try {
    await navigator.clipboard.writeText(uploadResult.value.pickupCode)
    uiStore.showSuccess('复制成功', '取件码已复制到剪贴板')
  } catch (error) {
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = uploadResult.value.pickupCode
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    
    uiStore.showSuccess('复制成功', '取件码已复制到剪贴板')
  }
}

const sharePickupCode = async () => {
  if (!uploadResult.value) return
  
  const shareData = {
    title: '文件分享',
    text: `取件码: ${uploadResult.value.pickupCode}`,
    url: `${window.location.origin}/pickup?code=${uploadResult.value.pickupCode}`
  }
  
  try {
    if (navigator.share) {
      await navigator.share(shareData)
    } else {
      // 降级方案：复制分享链接
      await navigator.clipboard.writeText(shareData.url)
      uiStore.showSuccess('分享链接已复制', '已复制到剪贴板，可以分享给他人')
    }
  } catch (error) {
    console.error('分享失败:', error)
  }
}

const resetUpload = () => {
  selectedFile.value = null
  uploadResult.value = null
  uploadProgress.value = 0
  fileDescription.value = ''
  uploadCubeRef.value?.resetUpload()
}

const goToPickup = () => {
  router.push('/pickup')
}

const formatExpireTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

const formatTimeRemaining = (milliseconds: number): string => {
  return apiUtils.formatTimeRemaining(milliseconds)
}

const downloadQR = (code: string) => {
  // TODO: 实现二维码下载功能
  uiStore.showInfo('功能开发中', '二维码下载功能即将上线')
}
</script>

<style scoped>
.upload-drop-zone {
  @apply border-2 border-dashed border-gray-600 rounded-xl p-12 cursor-pointer transition-all duration-300 hover:border-blue-400 hover:bg-blue-50 hover:bg-opacity-5;
}

.upload-drop-zone.drag-over {
  @apply border-blue-400 bg-blue-50 bg-opacity-10 scale-105;
}

.upload-drop-zone.uploading {
  @apply border-gray-500 cursor-default;
}

.pickup-code-display {
  @apply max-w-md mx-auto;
}

.pickup-code {
  @apply text-4xl font-mono font-bold text-white bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent p-4 border border-gray-600 rounded-lg mb-4;
  letter-spacing: 0.2em;
}

.file-info {
  @apply bg-gray-700 bg-opacity-30;
}

/* 动画效果 */
.upload-container {
  animation-delay: 0.2s;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .upload-drop-zone {
    @apply p-6;
  }
  
  .pickup-code {
    @apply text-2xl;
  }
}
</style>
