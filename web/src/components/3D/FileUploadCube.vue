<template>
  <div 
    ref="containerRef" 
    class="file-upload-cube relative w-full h-64 md:h-80 lg:h-96 rounded-lg overflow-hidden"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
    @click="triggerFileInput"
  >
    <!-- 3D容器 -->
    <div ref="cubeContainer" class="absolute inset-0"></div>
    
    <!-- 拖拽提示层 -->
    <div 
      v-show="!isDragging && !isUploading"
      class="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-20 backdrop-blur-sm transition-opacity duration-300"
      :class="{ 'opacity-100': !file, 'opacity-0 pointer-events-none': file }"
    >
      <div class="text-center space-y-4">
        <div class="w-16 h-16 mx-auto rounded-full bg-blue-500 bg-opacity-20 flex items-center justify-center mb-4">
          <el-icon class="text-3xl text-blue-400">
            <Upload />
          </el-icon>
        </div>
        <h3 class="text-xl font-semibold text-white">拖拽文件到此处</h3>
        <p class="text-gray-300">或点击选择文件上传</p>
        <p class="text-sm text-gray-400">支持图片、文档、压缩包等格式，最大50MB</p>
      </div>
    </div>
    
    <!-- 拖拽悬停状态 -->
    <div 
      v-show="isDragging"
      class="absolute inset-0 flex items-center justify-center bg-blue-500 bg-opacity-30 backdrop-blur-sm border-2 border-blue-400 border-dashed"
    >
      <div class="text-center">
        <el-icon class="text-4xl text-blue-300 animate-bounce mb-4">
          <Download />
        </el-icon>
        <h3 class="text-xl font-bold text-white">释放文件开始上传</h3>
      </div>
    </div>
    
    <!-- 上传进度状态 -->
    <div 
      v-show="isUploading"
      class="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
    >
      <div class="text-center space-y-4">
        <div class="w-20 h-20 mx-auto">
          <el-progress 
            type="circle" 
            :percentage="uploadProgress" 
            :width="80"
            :stroke-width="6"
            color="#3b82f6"
          />
        </div>
        <h3 class="text-lg font-semibold text-white">文件上传中...</h3>
        <p class="text-gray-300">{{ file?.name }}</p>
      </div>
    </div>
    
    <!-- 上传成功状态 -->
    <div 
      v-show="uploadSuccess"
      class="absolute inset-0 flex flex-col items-center justify-center bg-green-500 bg-opacity-20 backdrop-blur-sm"
    >
      <div class="text-center space-y-4">
        <el-icon class="text-5xl text-green-400 animate-pulse">
          <Check />
        </el-icon>
        <h3 class="text-xl font-bold text-white">上传成功！</h3>
        <p class="text-gray-300">文件已安全存储</p>
      </div>
    </div>
    
    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      class="hidden"
      :accept="acceptedTypes.join(',')"
      @change="handleFileSelect"
    >
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Upload, Download, Check } from '@element-plus/icons-vue'
import * as THREE from 'node_modules/@types/three'
import { gsap } from 'gsap'

// Props
interface Props {
  acceptedTypes?: string[]
  maxSize?: number // MB
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  acceptedTypes: () => [
    '.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx', 
    '.txt', '.zip', '.rar', '.7z'
  ],
  maxSize: 50,
  disabled: false
})

// Emits
interface Emits {
  (e: 'file-selected', file: File): void
  (e: 'upload-progress', progress: number): void
  (e: 'upload-success', result: any): void
  (e: 'upload-error', error: string): void
}

const emit = defineEmits<Emits>()

// Template refs
const containerRef = ref<HTMLElement>()
const cubeContainer = ref<HTMLElement>()
const fileInputRef = ref<HTMLInputElement>()

// 响应式状态
const isDragging = ref(false)
const isUploading = ref(false)
const uploadSuccess = ref(false)
const uploadProgress = ref(0)
const file = ref<File | null>(null)

// 3D相关变量
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let renderer: THREE.WebGLRenderer | null = null
let cube: THREE.Mesh | null = null
let edges: THREE.LineSegments | null = null
let particles: THREE.Points | null = null
let animationId: number | null = null

/**
 * 初始化3D立方体场景
 */
const init3DCube = async () => {
  if (!cubeContainer.value) return

  try {
    const container = cubeContainer.value
    const { clientWidth, clientHeight } = container

    // 创建场景
    scene = new THREE.Scene()

    // 创建相机
    camera = new THREE.PerspectiveCamera(
      75,
      clientWidth / clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 0, 5)

    // 创建渲染器
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    renderer.setSize(clientWidth, clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    
    container.appendChild(renderer.domElement)

    // 创建立方体
    createCube()
    
    // 创建粒子效果
    createParticleEffect()
    
    // 添加光源
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    scene.add(ambientLight)
    
    const pointLight = new THREE.PointLight(0x4a90e2, 1, 100)
    pointLight.position.set(10, 10, 10)
    scene.add(pointLight)

    // 开始渲染循环
    startRenderLoop()

    console.log('✅ 3D文件上传立方体初始化成功')

  } catch (error) {
    console.error('❌ 3D立方体初始化失败:', error)
  }
}

/**
 * 创建立方体
 */
const createCube = () => {
  if (!scene) return

  // 立方体几何体
  const geometry = new THREE.BoxGeometry(2, 2, 2)
  
  // 立方体材质
  const material = new THREE.MeshPhongMaterial({
    color: 0x4a90e2,
    transparent: true,
    opacity: 0.3,
    wireframe: false
  })
  
  cube = new THREE.Mesh(geometry, material)
  scene.add(cube)

  // 创建边框
  const edgesGeometry = new THREE.EdgesGeometry(geometry)
  const edgesMaterial = new THREE.LineBasicMaterial({
    color: 0x4a90e2,
    transparent: true,
    opacity: 0.8
  })
  
  edges = new THREE.LineSegments(edgesGeometry, edgesMaterial)
  scene.add(edges)

  // 添加缓慢旋转动画
  gsap.to(cube.rotation, {
    duration: 10,
    x: Math.PI * 2,
    y: Math.PI * 2,
    repeat: -1,
    ease: 'none'
  })

  gsap.to(edges.rotation, {
    duration: 10,
    x: Math.PI * 2,
    y: Math.PI * 2,
    repeat: -1,
    ease: 'none'
  })
}

/**
 * 创建粒子效果
 */
const createParticleEffect = () => {
  if (!scene) return

  const particleCount = 200
  const positions = new Float32Array(particleCount * 3)

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 10
    positions[i + 1] = (Math.random() - 0.5) * 10
    positions[i + 2] = (Math.random() - 0.5) * 10
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = new THREE.PointsMaterial({
    color: 0x4a90e2,
    size: 0.02,
    transparent: true,
    opacity: 0.6
  })

  particles = new THREE.Points(geometry, material)
  scene.add(particles)
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
 * 拖拽悬停动画
 */
const animateDragOver = () => {
  if (!cube || !edges) return

  gsap.to(cube.scale, {
    duration: 0.3,
    x: 1.2, y: 1.2, z: 1.2,
    ease: 'power2.out'
  })

  gsap.to(edges.scale, {
    duration: 0.3,
    x: 1.2, y: 1.2, z: 1.2,
    ease: 'power2.out'
  })

  gsap.to(cube.material, {
    duration: 0.3,
    opacity: 0.6
  })
}

/**
 * 拖拽离开动画
 */
const animateDragLeave = () => {
  if (!cube || !edges) return

  gsap.to(cube.scale, {
    duration: 0.3,
    x: 1, y: 1, z: 1,
    ease: 'power2.out'
  })

  gsap.to(edges.scale, {
    duration: 0.3,
    x: 1, y: 1, z: 1,
    ease: 'power2.out'
  })

  gsap.to(cube.material, {
    duration: 0.3,
    opacity: 0.3
  })
}

/**
 * 文件投放成功动画
 */
const animateFileDropSuccess = () => {
  if (!cube || !edges || !scene) return

  // 立方体爆炸效果
  gsap.to(cube.rotation, {
    duration: 1,
    x: Math.PI * 4,
    y: Math.PI * 4,
    ease: 'power2.inOut'
  })

  // 创建成功粒子爆炸
  createSuccessParticles()
}

/**
 * 创建成功粒子效果
 */
const createSuccessParticles = () => {
  if (!scene) return

  const particleCount = 100
  const positions = new Float32Array(particleCount * 3)
  const velocities = new Float32Array(particleCount * 3)

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = 0
    positions[i + 1] = 0
    positions[i + 2] = 0

    velocities[i] = (Math.random() - 0.5) * 0.2
    velocities[i + 1] = (Math.random() - 0.5) * 0.2
    velocities[i + 2] = (Math.random() - 0.5) * 0.2
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = new THREE.PointsMaterial({
    color: 0x10b981,
    size: 0.05,
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
    material.opacity = Math.max(0, 1 - frame / 60)

    if (frame < 60) {
      requestAnimationFrame(animateParticles)
    } else {
      scene?.remove(successParticles)
      geometry.dispose()
      material.dispose()
    }
  }
  animateParticles()
}

// 事件处理
const handleDragOver = (e: DragEvent) => {
  if (props.disabled) return
  
  isDragging.value = true
  animateDragOver()
}

const handleDragLeave = (e: DragEvent) => {
  if (props.disabled) return
  
  isDragging.value = false
  animateDragLeave()
}

const handleDrop = (e: DragEvent) => {
  if (props.disabled) return
  
  isDragging.value = false
  animateDragLeave()
  
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    handleFile(files[0])
  }
}

const triggerFileInput = () => {
  if (props.disabled || isUploading.value) return
  fileInputRef.value?.click()
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    handleFile(files[0])
  }
}

const handleFile = (selectedFile: File) => {
  // 文件大小检查
  if (selectedFile.size > props.maxSize * 1024 * 1024) {
    emit('upload-error', `文件大小超出限制（最大${props.maxSize}MB）`)
    return
  }

  // 文件类型检查
  const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase()
  if (!props.acceptedTypes.includes(fileExt)) {
    emit('upload-error', '不支持的文件类型')
    return
  }

  file.value = selectedFile
  emit('file-selected', selectedFile)
  
  // 播放投放成功动画
  animateFileDropSuccess()
}

// 监听上传状态变化
watch(isUploading, (newValue) => {
  if (newValue) {
    uploadSuccess.value = false
  }
})

watch(uploadProgress, (newValue) => {
  emit('upload-progress', newValue)
})

// 窗口大小变化处理
const handleResize = () => {
  if (!camera || !renderer || !cubeContainer.value) return
  
  const { clientWidth, clientHeight } = cubeContainer.value
  camera.aspect = clientWidth / clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(clientWidth, clientHeight)
}

// 生命周期
onMounted(() => {
  init3DCube()
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

// 暴露方法给父组件
defineExpose({
  startUpload: (progress: number = 0) => {
    isUploading.value = true
    uploadProgress.value = progress
  },
  updateProgress: (progress: number) => {
    uploadProgress.value = progress
  },
  finishUpload: () => {
    isUploading.value = false
    uploadSuccess.value = true
    setTimeout(() => {
      uploadSuccess.value = false
      file.value = null
    }, 3000)
  },
  resetUpload: () => {
    isUploading.value = false
    uploadSuccess.value = false
    uploadProgress.value = 0
    file.value = null
  }
})
</script>

<style scoped>
.file-upload-cube {
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  border: 2px dashed rgba(74, 144, 226, 0.3);
  transition: all 0.3s ease;
}

.file-upload-cube:hover {
  border-color: rgba(74, 144, 226, 0.6);
  background: linear-gradient(135deg, rgba(74, 144, 226, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%);
}

.file-upload-cube.dragging {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.2);
  transform: scale(1.02);
}

/* 确保3D canvas不阻挡交互 */
:deep(canvas) {
  pointer-events: none;
}
</style>
