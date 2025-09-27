import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// 路由配置
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomePage.vue'),
    meta: {
      title: '首页',
      transition: 'fade',
      keepAlive: true
    }
  },
  {
    path: '/upload',
    name: 'upload',
    component: () => import('@/views/UploadPage.vue'),
    meta: {
      title: '上传文件',
      transition: 'slide-left',
      keepAlive: false
    }
  },
  {
    path: '/pickup',
    name: 'pickup',
    component: () => import('@/views/PickupPage.vue'),
    meta: {
      title: '取件下载',
      transition: 'slide-right',
      keepAlive: false
    }
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutPage.vue'),
    meta: {
      title: '关于系统',
      transition: 'fade',
      keepAlive: true
    }
  },
  {
    path: '/test',
    name: 'test',
    component: () => import('@/views/TestPage.vue'),
    meta: {
      title: 'API测试',
      transition: 'fade',
      keepAlive: false
    }
  },
  // 404页面
  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    component: () => import('@/views/NotFoundPage.vue'),
    meta: {
      title: '页面不存在',
      transition: 'fade'
    }
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 保存滚动位置
    if (savedPosition) {
      return savedPosition
    }
    
    // 如果有锚点，滚动到锚点
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth'
      }
    }
    
    // 默认滚动到顶部
    return { top: 0, behavior: 'smooth' }
  }
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 开始加载进度
  console.log(`🚀 路由跳转: ${from.path} -> ${to.path}`)
  
  // 这里可以添加权限验证、登录检查等逻辑
  // if (to.meta.requiresAuth && !isAuthenticated()) {
  //   next('/login')
  //   return
  // }
  
  next()
})

// 全局后置钩子
router.afterEach((to, from) => {
  // 更新页面标题
  const title = to.meta?.title as string
  if (title) {
    document.title = `${title} - 公司文件管理系统`
  } else {
    document.title = '公司文件管理系统'
  }
  
  // 结束加载进度
  console.log(`✅ 路由跳转完成: ${to.path}`)
  
  // 页面访问统计
  if (typeof gtag !== 'undefined') {
    gtag('config', 'GA_MEASUREMENT_ID', {
      page_path: to.path,
      page_title: title || '公司文件管理系统'
    })
  }
})

// 路由错误处理
router.onError((error) => {
  console.error('❌ 路由错误:', error)
  
  // 这里可以添加错误上报逻辑
  // reportError('Router Error', error)
})

export default router

// 路由工具函数
export const routeUtils = {
  /**
   * 检查当前路由是否匹配
   */
  isCurrentRoute(name: string): boolean {
    return router.currentRoute.value.name === name
  },

  /**
   * 获取当前路由标题
   */
  getCurrentTitle(): string {
    return (router.currentRoute.value.meta?.title as string) || '公司文件管理系统'
  },

  /**
   * 安全跳转
   */
  safePush(to: string | { name: string; params?: any; query?: any }) {
    try {
      return router.push(to)
    } catch (error) {
      console.error('路由跳转失败:', error)
      return Promise.reject(error)
    }
  },

  /**
   * 安全替换
   */
  safeReplace(to: string | { name: string; params?: any; query?: any }) {
    try {
      return router.replace(to)
    } catch (error) {
      console.error('路由替换失败:', error)
      return Promise.reject(error)
    }
  },

  /**
   * 返回上一页
   */
  goBack() {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push('/')
    }
  }
}
