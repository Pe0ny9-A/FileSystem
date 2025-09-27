<template>
  <div 
    ref="containerRef" 
    class="pickup-code-card relative w-full h-64 md:h-80 rounded-xl overflow-hidden"
  >
    <!-- 3D容器 -->
    <div ref="cardContainer" class="absolute inset-0"></div>
    
    <!-- 取件码信息覆盖层 -->
    <div class="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-20 backdrop-blur-sm">
      <div class="text-center space-y-6">
        <!-- 取件码显示 -->
        <div class="space-y-2">
          <h3 class="text-lg font-medium text-gray-300">您的取件码</h3>
          <div 
            class="inline-flex items-center space-x-2 px-6 py-3 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg border border-white border-opacity-20"
            @click="copyCode"
          >
            <span class="text-3xl font-mono font-bold text-white tracking-widest">
              {{ displayCode }}
            </span>
            <el-icon 
              class="text-xl cursor-pointer hover:text-blue-300 transition-colors"
              :class="{ 'text-green-400': copied, 'text-blue-400': !copied }"
            >
              <component :is="copied ? 'Check' : 'CopyDocument'" />
            </el-icon>
          </div>
          <p class="text-sm text-gray-400">点击复制取件码</p>
        </div>

        <!-- 文件信息 -->
        <div v-if="fileInfo" class="space-y-3">
          <div class="text-center">
            <p class="text-white font-medium">{{ fileInfo.originalName }}</p>
            <p class="text-gray-400 text-sm">{{ fileInfo.formattedSize }}</p>
          </div>
          
          <!-- 过期时间 -->
          <div class="flex items-center justify-center space-x-2 text-sm text-gray-300">
            <el-icon><Clock /></el-icon>
            <span>{{ fileInfo.expiresIn }} 后过期</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex space-x-4">
          <el-button 
            type="primary" 
            size="large"
            @click="shareCode"
            :icon="Share"
          >
            分享取件码
          </el-button>
          <el-button 
            size="large"
            @click="downloadQR"
            :icon="Picture"
            :loading="qrLoading"
          >
            生成二维码
          </el-button>
        </div>
      </div>
    </div>

    <!-- 全息投影效果指示器 -->
    <div class="absolute top-4 right-4">
      <div class="flex space-x-1">
        <div class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
        <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse" style="animation-delay: 0.2s"></div>
        <div class="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style="animation-delay: 0.4s"></div>
      </div>
    </div>

    <!-- 二维码对话框 -->
    <el-dialog
      v-model="qrDialogVisible"
      title="取件码二维码"
      width="400px"
      align-center
      :show-close="true"
    >
      <div class="text-center space-y-4">
        <!-- 二维码显示 -->
        <div class="flex justify-center">
          <div class="p-4 bg-white rounded-lg shadow-lg">
            <img 
              v-if="qrCodeData" 
              :src="qrCodeData" 
              alt="取件码二维码"
              class="w-64 h-64 object-contain"
            />
          </div>
        </div>

        <!-- 取件码显示 -->
        <div class="space-y-2">
          <p class="text-sm text-gray-600">取件码</p>
          <p class="text-2xl font-mono font-bold text-gray-900 tracking-widest">
            {{ props.pickupCode }}
          </p>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-center space-x-3 pt-4">
          <el-button 
            type="primary" 
            @click="downloadQRImage"
            :icon="Picture"
          >
            下载二维码
          </el-button>
          <el-button 
            @click="copyQRLink"
            :icon="CopyDocument"
          >
            复制链接
          </el-button>
        </div>

        <!-- 说明文本 -->
        <p class="text-xs text-gray-500 mt-4">
          扫描二维码或使用取件码即可下载文件
        </p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { CopyDocument, Check, Clock, Share, Picture } from '@element-plus/icons-vue'
import { ElMessage, ElDialog } from 'element-plus'
import * as THREE from 'three'
import { gsap } from 'gsap'
import { apiClient } from '../../utils/api'

// Props
interface Props {
  pickupCode: string
  fileInfo?: {
    originalName: string
    size: number
    formattedSize: string
    expiresIn: string
    expiresAt: number
  }
  theme?: 'default' | 'success' | 'warning'
}

const props = withDefaults(defineProps<Props>(), {
  theme: 'default'
})

// Emits
interface Emits {
  (e: 'share-code', code: string): void
  (e: 'download-qr', code: string): void
}

const emit = defineEmits<Emits>()

// Template refs
const containerRef = ref<HTMLElement>()
const cardContainer = ref<HTMLElement>()

// 响应式状态
const copied = ref(false)
const displayCode = ref('')
const qrDialogVisible = ref(false)
const qrCodeData = ref<string>('')
const qrLoading = ref(false)

// 3D相关变量
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let cardGroup: THREE.Group | null = null
let hologramEffect: THREE.Mesh | null = null
let particles: THREE.Points | null = null
let animationId: number | null = null

/**
 * 初始化3D卡片场景
 */
const init3DCard = async () => {
  if (!cardContainer.value) return

  try {
    const container = cardContainer.value
    const { clientWidth, clientHeight } = container

    // 创建场景
    scene = new THREE.Scene()

    // 创建相机
    camera = new THREE.PerspectiveCamera(
      60,
      clientWidth / clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 8)

    // 创建渲染器
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    renderer.setSize(clientWidth, clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    
    container.appendChild(renderer.domElement)

    // 创建3D卡片
    create3DCard()
    
    // 创建全息投影效果
    createHologramEffect()
    
    // 创建粒子环境
    createParticleEnvironment()
    
    // 添加光源
    setupLighting()

    // 开始渲染循环
    startRenderLoop()

    console.log('✅ 3D取件码卡片初始化成功')

  } catch (error) {
    console.error('❌ 3D卡片初始化失败:', error)
  }
}

/**
 * 创建3D卡片
 */
const create3DCard = () => {
  if (!scene) return

  cardGroup = new THREE.Group()

  // 主卡片
  const cardGeometry = new THREE.PlaneGeometry(4, 2.5, 32, 32)
  const cardMaterial = new THREE.MeshPhongMaterial({
    color: getThemeColor(),
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    shininess: 100
  })

  const cardMesh = new THREE.Mesh(cardGeometry, cardMaterial)
  cardGroup.add(cardMesh)

  // 卡片边框
  const borderGeometry = new THREE.EdgesGeometry(cardGeometry)
  const borderMaterial = new THREE.LineBasicMaterial({
    color: getThemeColor(),
    transparent: true,
    opacity: 1
  })
  const borderMesh = new THREE.LineSegments(borderGeometry, borderMaterial)
  cardGroup.add(borderMesh)

  // 卡片背面
  const backMesh = cardMesh.clone()
  backMesh.position.z = -0.02
  backMesh.material = cardMaterial.clone()
  ;(backMesh.material as THREE.MeshPhongMaterial).opacity = 0.6
  cardGroup.add(backMesh)

  scene.add(cardGroup)

  // 添加旋转动画
  gsap.to(cardGroup.rotation, {
    duration: 8,
    y: Math.PI * 2,
    repeat: -1,
    ease: 'none'
  })

  // 添加浮动动画
  gsap.to(cardGroup.position, {
    duration: 3,
    y: 0.3,
    repeat: -1,
    yoyo: true,
    ease: 'power2.inOut'
  })
}

/**
 * 创建全息投影效果
 */
const createHologramEffect = () => {
  if (!scene) return

  // 全息投影圆环
  const ringGeometry = new THREE.RingGeometry(2.5, 3, 32)
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: getThemeColor(),
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  })

  hologramEffect = new THREE.Mesh(ringGeometry, ringMaterial)
  hologramEffect.rotation.x = Math.PI / 2
  hologramEffect.position.y = -1.5
  scene.add(hologramEffect)

  // 全息投影旋转动画
  gsap.to(hologramEffect.rotation, {
    duration: 4,
    z: Math.PI * 2,
    repeat: -1,
    ease: 'none'
  })

  // 全息投影脉冲效果
  gsap.to(hologramEffect.scale, {
    duration: 2,
    x: 1.1,
    y: 1.1,
    z: 1.1,
    repeat: -1,
    yoyo: true,
    ease: 'power2.inOut'
  })
}

/**
 * 创建粒子环境
 */
const createParticleEnvironment = () => {
  if (!scene) return

  const particleCount = 150
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)

  const color = new THREE.Color(getThemeColor())

  for (let i = 0; i < particleCount * 3; i += 3) {
    // 创建围绕卡片的粒子
    const radius = 5 + Math.random() * 3
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI

    positions[i] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i + 2] = radius * Math.cos(phi)

    // 设置粒子颜色
    colors[i] = color.r
    colors[i + 1] = color.g
    colors[i + 2] = color.b
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 0.03,
    transparent: true,
    opacity: 0.8,
    vertexColors: true
  })

  particles = new THREE.Points(geometry, material)
  scene.add(particles)
}

/**
 * 设置光源
 */
const setupLighting = () => {
  if (!scene) return

  // 环境光
  const ambientLight = new THREE.AmbientLight(0x404040, 0.4)
  scene.add(ambientLight)

  // 主光源
  const directionalLight = new THREE.DirectionalLight(getThemeColor(), 0.8)
  directionalLight.position.set(5, 5, 5)
  scene.add(directionalLight)

  // 补充光源
  const pointLight = new THREE.PointLight(getThemeColor(), 0.6, 100)
  pointLight.position.set(-5, -5, 5)
  scene.add(pointLight)
}

/**
 * 获取主题颜色
 */
const getThemeColor = (): number => {
  const themeColors = {
    default: 0x4a90e2,
    success: 0x10b981,
    warning: 0xf59e0b
  }
  return themeColors[props.theme] || themeColors.default
}

/**
 * 开始渲染循环
 */
const startRenderLoop = () => {
  const animate = () => {
    if (!scene || !camera || !renderer) return

    // 更新粒子旋转
    if (particles) {
      particles.rotation.x += 0.001
      particles.rotation.y += 0.002
    }

    renderer.render(scene, camera)
    animationId = requestAnimationFrame(animate)
  }
  animate()
}

/**
 * 打字机效果显示取件码
 */
const typewriterEffect = () => {
  const code = props.pickupCode
  let index = 0
  
  const type = () => {
    if (index <= code.length) {
      displayCode.value = code.substring(0, index)
      index++
      setTimeout(type, 150)
    }
  }
  
  type()
}

/**
 * 复制取件码
 */
const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(props.pickupCode)
    copied.value = true
    ElMessage.success('取件码已复制到剪贴板')
    
    // 3秒后恢复图标
    setTimeout(() => {
      copied.value = false
    }, 3000)
    
    // 触发复制成功动画
    animateCopySuccess()
    
  } catch (error) {
    ElMessage.error('复制失败，请手动选择复制')
  }
}

/**
 * 复制成功动画
 */
const animateCopySuccess = () => {
  if (!cardGroup) return

  // 卡片闪烁效果
  gsap.to(cardGroup.scale, {
    duration: 0.2,
    x: 1.1,
    y: 1.1,
    z: 1.1,
    yoyo: true,
    repeat: 1,
    ease: 'power2.inOut'
  })

  // 创建复制成功粒子
  createCopySuccessParticles()
}

/**
 * 创建复制成功粒子效果
 */
const createCopySuccessParticles = () => {
  if (!scene) return

  const particleCount = 50
  const positions = new Float32Array(particleCount * 3)
  const velocities = new Float32Array(particleCount * 3)

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = 0
    positions[i + 1] = 0
    positions[i + 2] = 0

    velocities[i] = (Math.random() - 0.5) * 0.3
    velocities[i + 1] = (Math.random() - 0.5) * 0.3
    velocities[i + 2] = (Math.random() - 0.5) * 0.3
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = new THREE.PointsMaterial({
    color: 0x10b981,
    size: 0.08,
    transparent: true,
    opacity: 1
  })

  const successParticles = new THREE.Points(geometry, material)
  scene.add(successParticles)

  // 粒子扩散动画
  let frame = 0
  const animateParticles = () => {
    frame++
    const positions = geometry.attributes.position.array as Float32Array

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] += velocities[i]
      positions[i + 1] += velocities[i + 1]
      positions[i + 2] += velocities[i + 2]
    }

    geometry.attributes.position.needsUpdate = true
    material.opacity = Math.max(0, 1 - frame / 40)

    if (frame < 40) {
      requestAnimationFrame(animateParticles)
    } else {
      scene?.remove(successParticles)
      geometry.dispose()
      material.dispose()
    }
  }
  animateParticles()
}

/**
 * 分享取件码
 */
const shareCode = () => {
  emit('share-code', props.pickupCode)
}

/**
 * 生成并显示二维码
 */
const downloadQR = async () => {
  try {
    qrLoading.value = true
    
    // 生成二维码
    const qrResult = await apiClient.generateQRCode(props.pickupCode, {
      format: 'png',
      size: 256,
      margin: 4
    })
    
    qrCodeData.value = qrResult.qrData
    qrDialogVisible.value = true
    
    ElMessage.success('二维码生成成功')
    
  } catch (error) {
    console.error('生成二维码失败:', error)
    ElMessage.error('生成二维码失败，请稍后重试')
  } finally {
    qrLoading.value = false
  }
}

/**
 * 下载二维码图片
 */
const downloadQRImage = async () => {
  try {
    const blob = await apiClient.downloadQRCode(props.pickupCode, {
      size: 512,
      margin: 4
    })
    
    // 创建下载链接
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pickup-code-${props.pickupCode}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success('二维码下载成功')
    
  } catch (error) {
    console.error('下载二维码失败:', error)
    ElMessage.error('下载失败，请稍后重试')
  }
}

/**
 * 复制二维码链接
 */
const copyQRLink = async () => {
  try {
    const baseUrl = window.location.origin
    const pickupUrl = `${baseUrl}/pickup?code=${props.pickupCode}`
    
    await navigator.clipboard.writeText(pickupUrl)
    ElMessage.success('取件链接已复制到剪贴板')
    
  } catch (error) {
    ElMessage.error('复制失败，请手动选择复制')
  }
}

// 监听取件码变化
watch(() => props.pickupCode, () => {
  if (props.pickupCode) {
    typewriterEffect()
  }
}, { immediate: true })

// 监听主题变化
watch(() => props.theme, () => {
  if (cardGroup && hologramEffect && particles) {
    const color = getThemeColor()
    
    // 更新卡片颜色
    cardGroup.children.forEach(child => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhongMaterial) {
        child.material.color.setHex(color)
      }
      if (child instanceof THREE.LineSegments && child.material instanceof THREE.LineBasicMaterial) {
        child.material.color.setHex(color)
      }
    })
    
    // 更新全息投影颜色
    if (hologramEffect.material instanceof THREE.MeshBasicMaterial) {
      hologramEffect.material.color.setHex(color)
    }
    
    // 更新粒子颜色
    if (particles.material instanceof THREE.PointsMaterial) {
      particles.material.color.setHex(color)
    }
  }
})

// 窗口大小变化处理
const handleResize = () => {
  if (!camera || !renderer || !cardContainer.value) return
  
  const { clientWidth, clientHeight } = cardContainer.value
  camera.aspect = clientWidth / clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(clientWidth, clientHeight)
}

// 生命周期
onMounted(() => {
  init3DCard()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  // 停止动画循环
  if (animationId) {
    cancelAnimationFrame(animationId)
  }

  // 清理3D资源
  if (scene) {
    scene.clear()
  }
  if (renderer) {
    renderer.dispose()
    renderer.domElement.remove()
  }

  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.pickup-code-card {
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  border: 1px solid rgba(74, 144, 226, 0.2);
  box-shadow: 0 8px 32px rgba(74, 144, 226, 0.1);
}

/* 确保3D canvas不阻挡交互 */
:deep(canvas) {
  pointer-events: none;
}

/* 全息投影效果样式 */
.pickup-code-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    45deg,
    transparent 30%,
    rgba(74, 144, 226, 0.1) 50%,
    transparent 70%
  );
  animation: hologram-sweep 3s infinite;
  pointer-events: none;
}

@keyframes hologram-sweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
</style>
