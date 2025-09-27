<template>
  <header class="relative z-50 bg-black bg-opacity-20 backdrop-blur-md border-b border-gray-700">
    <div class="container mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <!-- Logo和标题 -->
        <div class="flex items-center space-x-4">
          <router-link 
            to="/" 
            class="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <el-icon class="text-white text-lg">
                <FolderOpened />
              </el-icon>
            </div>
            <div>
              <h1 class="text-xl font-bold text-white">文件管理系统</h1>
              <p class="text-xs text-gray-400 -mt-1">File Management System</p>
            </div>
          </router-link>
        </div>

        <!-- 导航菜单 -->
        <nav class="hidden md:flex items-center space-x-6">
          <router-link
            to="/"
            class="nav-link"
            :class="{ 'active': $route.name === 'home' }"
          >
            <el-icon class="mr-1"><House /></el-icon>
            首页
          </router-link>
          
          <router-link
            to="/upload"
            class="nav-link"
            :class="{ 'active': $route.name === 'upload' }"
          >
            <el-icon class="mr-1"><Upload /></el-icon>
            上传文件
          </router-link>
          
          <router-link
            to="/pickup"
            class="nav-link"
            :class="{ 'active': $route.name === 'pickup' }"
          >
            <el-icon class="mr-1"><Download /></el-icon>
            取件下载
          </router-link>
        </nav>

        <!-- 右侧操作区 -->
        <div class="flex items-center space-x-4">
          <!-- 3D设置按钮 -->
          <el-tooltip content="3D设置" placement="bottom">
            <el-button
              circle
              size="small"
              :type="uiStore.is3DEnabled ? 'primary' : 'default'"
              @click="toggle3D"
            >
              <el-icon><View /></el-icon>
            </el-button>
          </el-tooltip>

          <!-- 主题切换 -->
          <el-tooltip content="切换主题" placement="bottom">
            <el-button
              circle
              size="small"
              @click="toggleTheme"
            >
              <el-icon>
                <Sunny v-if="!uiStore.isDarkMode" />
                <Moon v-else />
              </el-icon>
            </el-button>
          </el-tooltip>

          <!-- 移动端菜单按钮 -->
          <el-button
            class="md:hidden"
            circle
            size="small"
            @click="showMobileMenu = !showMobileMenu"
          >
            <el-icon><Menu /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- 移动端菜单 -->
      <div
        v-show="showMobileMenu"
        class="md:hidden py-4 border-t border-gray-700 animate-fadeInDown"
      >
        <div class="flex flex-col space-y-2">
          <router-link
            to="/"
            class="mobile-nav-link"
            @click="showMobileMenu = false"
          >
            <el-icon class="mr-2"><House /></el-icon>
            首页
          </router-link>
          
          <router-link
            to="/upload"
            class="mobile-nav-link"
            @click="showMobileMenu = false"
          >
            <el-icon class="mr-2"><Upload /></el-icon>
            上传文件
          </router-link>
          
          <router-link
            to="/pickup"
            class="mobile-nav-link"
            @click="showMobileMenu = false"
          >
            <el-icon class="mr-2"><Download /></el-icon>
            取件下载
          </router-link>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { 
  FolderOpened, 
  House, 
  Upload, 
  Download, 
  View, 
  Sunny, 
  Moon, 
  Menu 
} from '@element-plus/icons-vue'
import { useUIStore } from '@/stores/uiStore'

// 状态管理
const uiStore = useUIStore()
const router = useRouter()

// 响应式数据
const showMobileMenu = ref(false)

// 方法
const toggle3D = () => {
  uiStore.update3DSettings({ 
    enabled: !uiStore.is3DEnabled 
  })
  
  if (uiStore.is3DEnabled) {
    uiStore.showSuccess('3D效果已开启', '享受沉浸式视觉体验')
  } else {
    uiStore.showInfo('3D效果已关闭', '性能模式已启用')
  }
}

const toggleTheme = () => {
  const newMode = uiStore.isDarkMode ? 'light' : 'dark'
  uiStore.updateTheme({ mode: newMode })
  
  uiStore.showSuccess(
    `已切换到${newMode === 'dark' ? '深色' : '浅色'}主题`,
    '主题设置已保存'
  )
}

// 监听路由变化，关闭移动端菜单
router.afterEach(() => {
  showMobileMenu.value = false
})
</script>

<style scoped>
.nav-link {
  @apply flex items-center px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-10 rounded-lg transition-all duration-200;
}

.nav-link.active {
  @apply text-white bg-blue-600 bg-opacity-80;
}

.mobile-nav-link {
  @apply flex items-center px-4 py-3 text-sm font-medium text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-10 rounded-lg transition-all duration-200;
}

.mobile-nav-link.router-link-active {
  @apply text-white bg-blue-600 bg-opacity-80;
}

/* 玻璃态效果 */
header {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* 响应式隐藏 */
@media (max-width: 768px) {
  .nav-link {
    @apply hidden;
  }
}
</style>
