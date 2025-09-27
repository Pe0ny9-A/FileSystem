<template>
  <div class="about-page min-h-screen py-8">
    <div class="container mx-auto px-4 max-w-4xl">
      <div class="text-center mb-12 animate-fadeInUp">
        <h1 class="text-3xl md:text-4xl font-bold text-white mb-4">
          关于系统
        </h1>
        <p class="text-gray-400 text-lg">
          了解我们的文件管理系统
        </p>
      </div>

      <div class="glass rounded-xl p-8 animate-fadeInUp">
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <el-icon class="text-3xl text-white">
              <FolderOpened />
            </el-icon>
          </div>
          <h2 class="text-2xl font-bold text-white mb-2">公司文件管理系统</h2>
          <p class="text-gray-400">版本 1.0.0</p>
        </div>

        <div class="space-y-8">
          <div>
            <h3 class="text-xl font-semibold text-white mb-4">系统简介</h3>
            <p class="text-gray-300 leading-relaxed">
              这是一个基于取件码机制的现代化文件共享平台，采用Vue3 + Three.js + Node.js技术栈构建。
              系统支持3D界面交互，为用户提供沉浸式的文件上传下载体验，无需登录注册即可快速完成文件传输。
            </p>
          </div>

          <div>
            <h3 class="text-xl font-semibold text-white mb-4">技术特色</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="feature-item">
                <el-icon class="text-blue-400 text-xl mb-2"><View /></el-icon>
                <h4 class="font-semibold text-white mb-2">3D视觉界面</h4>
                <p class="text-gray-400 text-sm">基于Three.js的现代化3D交互界面</p>
              </div>
              <div class="feature-item">
                <el-icon class="text-green-400 text-xl mb-2"><Lock /></el-icon>
                <h4 class="font-semibold text-white mb-2">安全可靠</h4>
                <p class="text-gray-400 text-sm">文件自动过期，多重安全验证</p>
              </div>
              <div class="feature-item">
                <el-icon class="text-purple-400 text-xl mb-2"><Lightning /></el-icon>
                <h4 class="font-semibold text-white mb-2">快速便捷</h4>
                <p class="text-gray-400 text-sm">无需登录，一键上传下载</p>
              </div>
              <div class="feature-item">
                <el-icon class="text-yellow-400 text-xl mb-2"><Monitor /></el-icon>
                <h4 class="font-semibold text-white mb-2">响应式设计</h4>
                <p class="text-gray-400 text-sm">完美适配桌面端和移动端</p>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-xl font-semibold text-white mb-4">开发</h3>
            <p class="text-gray-300">
              技术支持: Pe0ny9<br>
              如有问题或建议，请联系技术支持。
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FolderOpened, View, Lock, Lightning, Monitor } from '@element-plus/icons-vue'
</script>

<style scoped>
.feature-item {
  @apply p-4 text-center;
}
</style>
