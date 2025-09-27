<template>
  <div class="not-found-page min-h-screen flex items-center justify-center">
    <div class="text-center animate-fadeInUp">
      <div class="mb-8">
        <el-icon class="text-8xl text-gray-400 mb-4">
          <QuestionFilled />
        </el-icon>
        <h1 class="text-6xl font-bold text-white mb-4">404</h1>
        <h2 class="text-2xl font-semibold text-gray-300 mb-2">页面不存在</h2>
        <p class="text-gray-400 max-w-md mx-auto">
          抱歉，您访问的页面不存在或已被移除。请检查URL是否正确。
        </p>
      </div>

      <div class="space-x-4">
        <el-button type="primary" size="large" @click="goHome">
          <el-icon class="mr-2"><House /></el-icon>
          返回首页
        </el-button>
        <el-button size="large" @click="goBack">
          <el-icon class="mr-2"><Back /></el-icon>
          返回上页
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { QuestionFilled, House, Back } from '@element-plus/icons-vue'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>
