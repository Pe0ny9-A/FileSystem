<template>
  <teleport to="body">
    <div class="notification-container">
      <transition-group 
        name="notification"
        tag="div"
        class="fixed top-4 right-4 z-100 space-y-3 max-w-sm"
      >
        <div
          v-for="notification in notifications"
          :key="notification.id"
          :class="[
            'notification-item',
            `notification-${notification.type}`,
            'transform transition-all duration-300 ease-in-out'
          ]"
        >
          <!-- 通知图标 -->
          <div class="notification-icon">
            <el-icon :class="getIconClass(notification.type)">
              <component :is="getIcon(notification.type)" />
            </el-icon>
          </div>

          <!-- 通知内容 -->
          <div class="notification-content">
            <h4 class="notification-title">{{ notification.title }}</h4>
            <p v-if="notification.message" class="notification-message">
              {{ notification.message }}
            </p>
            <div class="notification-time">
              {{ formatTime(notification.timestamp) }}
            </div>
          </div>

          <!-- 关闭按钮 -->
          <button
            v-if="notification.showClose"
            @click="removeNotification(notification.id)"
            class="notification-close"
          >
            <el-icon><Close /></el-icon>
          </button>

          <!-- 进度条 -->
          <div
            v-if="notification.duration && notification.duration > 0"
            class="notification-progress"
            :style="{ 
              animationDuration: `${notification.duration}ms`,
              backgroundColor: getProgressColor(notification.type)
            }"
          ></div>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  Close, 
  SuccessFilled, 
  WarningFilled, 
  CircleCloseFilled, 
  InfoFilled 
} from '@element-plus/icons-vue'
import { useUIStore } from '@/stores/uiStore'

// 状态管理
const uiStore = useUIStore()

// 计算属性
const notifications = computed(() => uiStore.notifications)

// 方法
const removeNotification = (id: string) => {
  uiStore.removeNotification(id)
}

const getIcon = (type: string) => {
  const icons = {
    success: SuccessFilled,
    warning: WarningFilled,
    error: CircleCloseFilled,
    info: InfoFilled
  }
  return icons[type as keyof typeof icons] || InfoFilled
}

const getIconClass = (type: string) => {
  const classes = {
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
    info: 'text-blue-500'
  }
  return classes[type as keyof typeof classes] || 'text-blue-500'
}

const getProgressColor = (type: string) => {
  const colors = {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  }
  return colors[type as keyof typeof colors] || '#3b82f6'
}

const formatTime = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) {
    return '刚刚'
  } else if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  } else {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
}
</script>

<style scoped>
.notification-container {
  pointer-events: none;
}

.notification-item {
  @apply relative bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 min-w-80 max-w-sm;
  pointer-events: auto;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.notification-success {
  @apply border-l-4 border-l-green-500 bg-green-50 dark:bg-green-900 dark:bg-opacity-20;
}

.notification-warning {
  @apply border-l-4 border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900 dark:bg-opacity-20;
}

.notification-error {
  @apply border-l-4 border-l-red-500 bg-red-50 dark:bg-red-900 dark:bg-opacity-20;
}

.notification-info {
  @apply border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20;
}

.notification-icon {
  @apply absolute top-4 left-4 text-xl;
}

.notification-content {
  @apply ml-8 pr-8;
}

.notification-title {
  @apply font-semibold text-gray-900 dark:text-white text-sm mb-1;
}

.notification-message {
  @apply text-gray-600 dark:text-gray-300 text-xs leading-relaxed mb-2;
}

.notification-time {
  @apply text-gray-400 dark:text-gray-500 text-xs;
}

.notification-close {
  @apply absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700;
}

.notification-progress {
  @apply absolute bottom-0 left-0 h-1 bg-current rounded-bl-lg;
  animation: notification-progress linear forwards;
  width: 100%;
}

/* 动画 */
.notification-enter-active {
  transition: all 0.3s ease-out;
}

.notification-leave-active {
  transition: all 0.3s ease-in;
}

.notification-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.notification-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.notification-move {
  transition: transform 0.3s ease;
}

@keyframes notification-progress {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

/* 响应式设计 */
@media (max-width: 640px) {
  .notification-container {
    @apply top-2 right-2 left-2;
  }
  
  .notification-item {
    @apply min-w-0 max-w-none;
  }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
  .notification-item {
    @apply border-2;
  }
}

/* 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
  .notification-enter-active,
  .notification-leave-active,
  .notification-move {
    transition: none;
  }
  
  .notification-progress {
    animation: none;
  }
}

/* 暗色模式适配 */
.dark .notification-item {
  background: rgba(31, 41, 55, 0.95);
}

.dark .notification-success {
  background: rgba(16, 185, 129, 0.1);
}

.dark .notification-warning {
  background: rgba(245, 158, 11, 0.1);
}

.dark .notification-error {
  background: rgba(239, 68, 68, 0.1);
}

.dark .notification-info {
  background: rgba(59, 130, 246, 0.1);
}
</style>
