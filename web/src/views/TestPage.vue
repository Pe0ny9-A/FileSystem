<template>
  <div class="test-page min-h-screen py-8">
    <div class="container mx-auto px-4 max-w-4xl">
      <h1 class="text-3xl font-bold text-white mb-8">API连接测试</h1>
      
      <div class="space-y-6">
        <!-- API连接状态 -->
        <div class="glass rounded-lg p-6">
          <h2 class="text-xl font-semibold text-white mb-4">连接状态</h2>
          <div class="flex items-center space-x-4">
            <div 
              :class="[
                'w-4 h-4 rounded-full',
                connectionStatus === 'connected' ? 'bg-green-400' : 
                connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
              ]"
            ></div>
            <span class="text-white">
              {{ 
                connectionStatus === 'connected' ? '后端连接正常' :
                connectionStatus === 'connecting' ? '正在连接...' : '连接失败'
              }}
            </span>
          </div>
        </div>

        <!-- 测试按钮 -->
        <div class="glass rounded-lg p-6">
          <h2 class="text-xl font-semibold text-white mb-4">API测试</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <el-button @click="testHealth" type="primary" :loading="testing.health">
              健康检查
            </el-button>
            <el-button @click="testStats" type="success" :loading="testing.stats">
              系统统计
            </el-button>
            <el-button @click="testVerify" type="warning" :loading="testing.verify">
              验证测试
            </el-button>
            <el-button @click="testQRGeneration" type="info" :loading="testing.qr">
              二维码生成
            </el-button>
          </div>
        </div>

        <!-- 测试结果 -->
        <div v-if="testResults.length > 0" class="glass rounded-lg p-6">
          <h2 class="text-xl font-semibold text-white mb-4">测试结果</h2>
          <div class="space-y-3">
            <div 
              v-for="result in testResults" 
              :key="result.id"
              :class="[
                'p-3 rounded border-l-4',
                result.success ? 'bg-green-900 bg-opacity-20 border-green-400' : 'bg-red-900 bg-opacity-20 border-red-400'
              ]"
            >
              <div class="flex items-center justify-between">
                <span class="font-medium text-white">{{ result.name }}</span>
                <span class="text-sm text-gray-400">{{ new Date(result.timestamp).toLocaleTimeString() }}</span>
              </div>
              <div class="text-sm mt-1" :class="result.success ? 'text-green-300' : 'text-red-300'">
                {{ result.message }}
              </div>
              <div v-if="result.data" class="text-xs text-gray-400 mt-2">
                <pre>{{ JSON.stringify(result.data, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { apiClient } from '@/utils/api'
import { useUIStore } from '@/stores/uiStore'

const uiStore = useUIStore()

// 响应式数据
const connectionStatus = ref<'connecting' | 'connected' | 'disconnected'>('connecting')
const testing = ref({
  health: false,
  stats: false,
  verify: false,
  qr: false
})

interface TestResult {
  id: string
  name: string
  success: boolean
  message: string
  data?: any
  timestamp: number
}

const testResults = ref<TestResult[]>([])

// 方法
const addTestResult = (name: string, success: boolean, message: string, data?: any) => {
  testResults.value.unshift({
    id: Date.now().toString(),
    name,
    success,
    message,
    data,
    timestamp: Date.now()
  })
}

const testConnection = async () => {
  try {
    connectionStatus.value = 'connecting'
    const isHealthy = await apiClient.healthCheck()
    connectionStatus.value = isHealthy ? 'connected' : 'disconnected'
  } catch (error) {
    connectionStatus.value = 'disconnected'
  }
}

const testHealth = async () => {
  testing.value.health = true
  try {
    const isHealthy = await apiClient.healthCheck()
    addTestResult('健康检查', isHealthy, isHealthy ? '后端服务运行正常' : '后端服务异常')
  } catch (error: any) {
    addTestResult('健康检查', false, error.message || '请求失败')
  } finally {
    testing.value.health = false
  }
}

const testStats = async () => {
  testing.value.stats = true
  try {
    const stats = await apiClient.getSystemStats()
    addTestResult('系统统计', true, '获取统计信息成功', {
      活跃文件: stats.files.activeFiles,
      总存储: stats.files.formattedSize,
      活跃取件码: stats.codes.activeCodes
    })
  } catch (error: any) {
    addTestResult('系统统计', false, error.message || '获取统计信息失败')
  } finally {
    testing.value.stats = false
  }
}

const testVerify = async () => {
  testing.value.verify = true
  try {
    // 测试一个不存在的取件码
    await apiClient.verifyPickupCode('TEST01')
    addTestResult('取件码验证', false, '意外成功（应该失败）')
  } catch (error: any) {
    if (error.message.includes('不存在') || error.message.includes('验证失败')) {
      addTestResult('取件码验证', true, '正确返回取件码不存在错误')
    } else {
      addTestResult('取件码验证', false, error.message || '验证测试失败')
    }
  } finally {
    testing.value.verify = false
  }
}

const testQRGeneration = async () => {
  testing.value.qr = true
  try {
    // 测试二维码生成API
    const testCode = 'TEST01'
    const qrResult = await apiClient.generateQRCode(testCode, {
      format: 'png',
      size: 200,
      margin: 4
    })
    
    addTestResult('二维码生成', true, '二维码生成成功', {
      pickupCode: testCode,
      format: qrResult.format,
      size: qrResult.size,
      pickupUrl: qrResult.pickupUrl,
      dataLength: qrResult.qrData.length
    })
  } catch (error: any) {
    addTestResult('二维码生成', false, error.message || '二维码生成失败')
  } finally {
    testing.value.qr = false
  }
}

// 生命周期
onMounted(() => {
  testConnection()
})
</script>

<style scoped>
.test-page {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
}

pre {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  max-height: 200px;
  overflow-y: auto;
}
</style>
