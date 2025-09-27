import { ref } from 'vue'
import * as THREE from 'node_modules/@types/three'
import { gsap } from 'gsap'

// 3D背景管理
export function use3DBackground() {
  // 3D场景相关变量
  let scene: THREE.Scene | null = null
  let camera: THREE.PerspectiveCamera | null = null
  let renderer: THREE.WebGLRenderer | null = null
  let particles: THREE.Points | null = null
  let geometryParticles: THREE.BufferGeometry | null = null
  let materialParticles: THREE.PointsMaterial | null = null
  let animationId: number | null = null

  // 粒子系统参数
  const particleCount = 1000
  const particlePositions = new Float32Array(particleCount * 3)
  const particleVelocities = new Float32Array(particleCount * 3)

  // 响应式状态
  const isInitialized = ref(false)
  const isAnimating = ref(false)

  /**
   * 初始化3D背景
   */
  const initBackground = async (container: HTMLElement): Promise<void> => {
    try {
      if (!container || isInitialized.value) return

      // 创建场景
      scene = new THREE.Scene()
      scene.fog = new THREE.Fog(0x0a0a0a, 50, 200)

      // 创建相机
      const { clientWidth, clientHeight } = container
      camera = new THREE.PerspectiveCamera(
        75,
        clientWidth / clientHeight,
        0.1,
        1000
      )
      camera.position.set(0, 0, 50)

      // 创建渲染器
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      })
      renderer.setSize(clientWidth, clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x000000, 0)
      
      // 添加到容器
      container.appendChild(renderer.domElement)

      // 创建粒子系统
      createParticleSystem()

      // 创建环境光
      const ambientLight = new THREE.AmbientLight(0x404040, 0.3)
      scene.add(ambientLight)

      // 创建点光源
      const pointLight = new THREE.PointLight(0x4a90e2, 0.8, 100)
      pointLight.position.set(0, 0, 20)
      scene.add(pointLight)

      // 添加几何体装饰
      createGeometryDecorations()

      isInitialized.value = true
      console.log('✅ 3D背景初始化成功')

    } catch (error) {
      console.error('❌ 3D背景初始化失败:', error)
      throw error
    }
  }

  /**
   * 创建粒子系统
   */
  const createParticleSystem = () => {
    if (!scene) return

    // 初始化粒子位置和速度
    for (let i = 0; i < particleCount * 3; i += 3) {
      // 位置
      particlePositions[i] = (Math.random() - 0.5) * 200
      particlePositions[i + 1] = (Math.random() - 0.5) * 200
      particlePositions[i + 2] = (Math.random() - 0.5) * 200

      // 速度
      particleVelocities[i] = (Math.random() - 0.5) * 0.02
      particleVelocities[i + 1] = (Math.random() - 0.5) * 0.02
      particleVelocities[i + 2] = (Math.random() - 0.5) * 0.02
    }

    // 创建几何体
    geometryParticles = new THREE.BufferGeometry()
    geometryParticles.setAttribute(
      'position',
      new THREE.BufferAttribute(particlePositions, 3)
    )

    // 创建材质
    materialParticles = new THREE.PointsMaterial({
      color: 0x4a90e2,
      size: 0.5,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    })

    // 创建粒子点云
    particles = new THREE.Points(geometryParticles, materialParticles)
    scene.add(particles)
  }

  /**
   * 创建几何体装饰
   */
  const createGeometryDecorations = () => {
    if (!scene) return

    // 创建旋转的线框立方体
    const cubeGeometry = new THREE.BoxGeometry(10, 10, 10)
    const cubeEdges = new THREE.EdgesGeometry(cubeGeometry)
    const cubeMaterial = new THREE.LineBasicMaterial({
      color: 0x4a90e2,
      transparent: true,
      opacity: 0.3
    })
    const cube = new THREE.LineSegments(cubeEdges, cubeMaterial)
    cube.position.set(-30, 20, -20)
    scene.add(cube)

    // 添加旋转动画
    gsap.to(cube.rotation, {
      duration: 20,
      x: Math.PI * 2,
      y: Math.PI * 2,
      z: Math.PI * 2,
      repeat: -1,
      ease: 'none'
    })

    // 创建另一个几何体
    const torusGeometry = new THREE.TorusGeometry(8, 2, 8, 16)
    const torusEdges = new THREE.EdgesGeometry(torusGeometry)
    const torusMaterial = new THREE.LineBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.4
    })
    const torus = new THREE.LineSegments(torusEdges, torusMaterial)
    torus.position.set(30, -20, -30)
    scene.add(torus)

    // 添加旋转动画
    gsap.to(torus.rotation, {
      duration: 15,
      x: -Math.PI * 2,
      z: Math.PI * 2,
      repeat: -1,
      ease: 'none'
    })
  }

  /**
   * 更新3D背景
   */
  const updateBackground = (options?: {
    width?: number
    height?: number
    theme?: string
  }) => {
    if (!scene || !camera || !renderer) return

    try {
      // 更新渲染器大小
      if (options?.width && options?.height) {
        camera.aspect = options.width / options.height
        camera.updateProjectionMatrix()
        renderer.setSize(options.width, options.height)
      }

      // 更新主题
      if (options?.theme) {
        updateTheme(options.theme)
      }

      // 更新粒子位置
      updateParticles()

      // 渲染场景
      if (scene && camera) {
        renderer.render(scene, camera)
      }

    } catch (error) {
      console.error('3D背景更新失败:', error)
    }
  }

  /**
   * 更新粒子系统
   */
  const updateParticles = () => {
    if (!particles || !geometryParticles) return

    const positions = geometryParticles.attributes.position.array as Float32Array

    for (let i = 0; i < particleCount * 3; i += 3) {
      // 更新位置
      positions[i] += particleVelocities[i]
      positions[i + 1] += particleVelocities[i + 1]
      positions[i + 2] += particleVelocities[i + 2]

      // 边界检查
      if (Math.abs(positions[i]) > 100) {
        particleVelocities[i] *= -1
      }
      if (Math.abs(positions[i + 1]) > 100) {
        particleVelocities[i + 1] *= -1
      }
      if (Math.abs(positions[i + 2]) > 100) {
        particleVelocities[i + 2] *= -1
      }
    }

    geometryParticles.attributes.position.needsUpdate = true

    // 旋转粒子群
    particles.rotation.y += 0.001
    particles.rotation.x += 0.0005
  }

  /**
   * 更新主题
   */
  const updateTheme = (theme: string) => {
    if (!materialParticles || !scene) return

    const themeColors = {
      default: 0x4a90e2,
      upload: 0x10b981,
      pickup: 0x8b5cf6,
      about: 0xf59e0b
    }

    const color = themeColors[theme as keyof typeof themeColors] || themeColors.default
    materialParticles.color.setHex(color)

    // 更新场景雾的颜色
    if (scene.fog && scene.fog instanceof THREE.Fog) {
      scene.fog.color.setHex(color * 0.1)
    }
  }

  /**
   * 销毁3D背景
   */
  const destroyBackground = () => {
    try {
      // 停止动画
      if (animationId) {
        cancelAnimationFrame(animationId)
        animationId = null
      }

      // 清理几何体
      if (geometryParticles) {
        geometryParticles.dispose()
        geometryParticles = null
      }

      // 清理材质
      if (materialParticles) {
        materialParticles.dispose()
        materialParticles = null
      }

      // 清理渲染器
      if (renderer) {
        renderer.dispose()
        renderer.domElement.remove()
        renderer = null
      }

      // 清理场景
      if (scene) {
        scene.clear()
        scene = null
      }

      camera = null
      particles = null
      isInitialized.value = false
      isAnimating.value = false

      console.log('✅ 3D背景已清理')

    } catch (error) {
      console.error('❌ 3D背景清理失败:', error)
    }
  }

  /**
   * 添加交互效果
   */
  const addInteractionEffect = (x: number, y: number) => {
    if (!scene || !camera) return

    // 创建波纹效果
    const rippleGeometry = new THREE.RingGeometry(0, 5, 16)
    const rippleMaterial = new THREE.MeshBasicMaterial({
      color: 0x4a90e2,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    })
    const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial)

    // 将屏幕坐标转换为3D坐标
    const vector = new THREE.Vector3(
      (x / window.innerWidth) * 2 - 1,
      -(y / window.innerHeight) * 2 + 1,
      0.5
    )
    vector.unproject(camera)

    const dir = vector.sub(camera.position).normalize()
    const distance = -camera.position.z / dir.z
    const pos = camera.position.clone().add(dir.multiplyScalar(distance))

    ripple.position.copy(pos)
    scene.add(ripple)

    // 动画效果
    gsap.to(ripple.scale, {
      duration: 1,
      x: 3,
      y: 3,
      z: 3,
      ease: 'power2.out'
    })

    gsap.to(rippleMaterial, {
      duration: 1,
      opacity: 0,
      ease: 'power2.out',
      onComplete: () => {
        scene?.remove(ripple)
        rippleGeometry.dispose()
        rippleMaterial.dispose()
      }
    })
  }

  /**
   * 检查WebGL支持
   */
  const checkWebGLSupport = (): boolean => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
      return !!gl
    } catch {
      return false
    }
  }

  return {
    // 状态
    isInitialized,
    isAnimating,

    // 方法
    initBackground,
    updateBackground,
    destroyBackground,
    addInteractionEffect,
    checkWebGLSupport
  }
}
