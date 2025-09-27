# FileSystem Docker 部署脚本 (PowerShell)
# 使用方法: .\scripts\deploy.ps1 [start|stop|build|status|logs|health|cleanup] [dev|prod]

param(
    [Parameter(Position=0)]
    [ValidateSet('start', 'stop', 'restart', 'build', 'status', 'logs', 'health', 'cleanup', 'help')]
    [string]$Command = 'help',
    
    [Parameter(Position=1)]
    [ValidateSet('dev', 'prod')]
    [string]$Environment = 'dev',
    
    [Parameter(Position=2)]
    [string]$Service
)

# 颜色函数
function Write-ColorText {
    param([string]$Text, [string]$Color = 'White')
    
    switch ($Color) {
        'Red' { Write-Host $Text -ForegroundColor Red }
        'Green' { Write-Host $Text -ForegroundColor Green }
        'Yellow' { Write-Host $Text -ForegroundColor Yellow }
        'Blue' { Write-Host $Text -ForegroundColor Blue }
        default { Write-Host $Text }
    }
}

function Log-Info { param([string]$Message) Write-ColorText "[INFO] $Message" 'Blue' }
function Log-Success { param([string]$Message) Write-ColorText "[SUCCESS] $Message" 'Green' }
function Log-Warning { param([string]$Message) Write-ColorText "[WARNING] $Message" 'Yellow' }
function Log-Error { param([string]$Message) Write-ColorText "[ERROR] $Message" 'Red' }

# 检查Docker是否安装
function Test-Docker {
    try {
        $null = docker --version
        $null = docker-compose --version
        return $true
    }
    catch {
        Log-Error "Docker 或 Docker Compose 未安装，请先安装"
        return $false
    }
}

# 检查环境变量文件
function Test-EnvFile {
    if (-not (Test-Path ".env.docker")) {
        Log-Warning "环境变量文件 .env.docker 不存在"
        if (Test-Path "env.docker.example") {
            Log-Info "复制示例环境变量文件..."
            Copy-Item "env.docker.example" ".env.docker"
            Log-Warning "请编辑 .env.docker 文件并设置正确的配置值"
            Log-Info "特别注意修改以下配置："
            Write-Host "  - SESSION_SECRET"
            Write-Host "  - JWT_SECRET"
            Write-Host "  - REDIS_PASSWORD"
            Write-Host "  - FRONTEND_URL"
            Read-Host "按回车键继续"
        }
        else {
            Log-Error "环境变量示例文件不存在"
            exit 1
        }
    }
}

# 构建镜像
function Build-Images {
    Log-Info "构建 Docker 镜像..."
    
    try {
        docker-compose build --no-cache
        Log-Success "镜像构建完成"
    }
    catch {
        Log-Error "镜像构建失败: $_"
        exit 1
    }
}

# 启动服务
function Start-Services {
    param([string]$EnvMode)
    
    Log-Info "启动服务 (模式: $EnvMode)..."
    
    try {
        docker-compose --env-file .env.docker up -d
        Log-Success "服务启动成功"
    }
    catch {
        Log-Error "服务启动失败: $_"
        exit 1
    }
}

# 停止服务
function Stop-Services {
    Log-Info "停止服务..."
    
    try {
        docker-compose down
        Log-Success "服务已停止"
    }
    catch {
        Log-Error "停止服务失败: $_"
    }
}

# 查看服务状态
function Show-Status {
    Log-Info "服务状态:"
    docker-compose ps
}

# 查看日志
function Show-Logs {
    param([string]$ServiceName)
    
    if ($ServiceName) {
        Log-Info "查看 $ServiceName 服务日志:"
        docker-compose logs -f $ServiceName
    }
    else {
        Log-Info "查看所有服务日志:"
        docker-compose logs -f
    }
}

# 清理资源
function Remove-Resources {
    Log-Warning "清理 Docker 资源..."
    
    try {
        docker-compose down -v --rmi all
        Log-Success "资源清理完成"
    }
    catch {
        Log-Error "资源清理失败: $_"
    }
}

# 健康检查
function Test-Health {
    Log-Info "执行健康检查..."
    
    # 检查后端健康状态
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get -TimeoutSec 5
        if ($response.status -eq "ok") {
            Log-Success "后端服务健康 ✓"
        }
        else {
            Log-Error "后端服务异常 ✗"
        }
    }
    catch {
        Log-Error "后端服务异常 ✗"
    }
    
    # 检查前端访问
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:80" -Method Get -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Log-Success "前端服务正常 ✓"
        }
        else {
            Log-Error "前端服务异常 ✗"
        }
    }
    catch {
        Log-Error "前端服务异常 ✗"
    }
    
    # 检查Redis连接
    try {
        $redisTest = docker exec file-system-redis redis-cli ping 2>$null
        if ($redisTest -eq "PONG") {
            Log-Success "Redis服务正常 ✓"
        }
        else {
            Log-Warning "Redis服务异常 ✗"
        }
    }
    catch {
        Log-Warning "Redis服务异常 ✗"
    }
}

# 显示帮助信息
function Show-Help {
    Write-Host "FileSystem Docker 部署脚本 (PowerShell)"
    Write-Host ""
    Write-Host "使用方法:"
    Write-Host "  .\scripts\deploy.ps1 [命令] [选项]"
    Write-Host ""
    Write-Host "命令:"
    Write-Host "  start [dev|prod]   启动服务 (默认: dev)"
    Write-Host "  stop               停止服务"
    Write-Host "  restart [dev|prod] 重启服务"
    Write-Host "  build              构建镜像"
    Write-Host "  status             查看服务状态"
    Write-Host "  logs [service]     查看日志"
    Write-Host "  health             健康检查"
    Write-Host "  cleanup            清理所有资源"
    Write-Host "  help               显示帮助信息"
    Write-Host ""
    Write-Host "示例:"
    Write-Host "  .\scripts\deploy.ps1 start prod     # 生产环境启动"
    Write-Host "  .\scripts\deploy.ps1 logs backend   # 查看后端日志"
    Write-Host "  .\scripts\deploy.ps1 health         # 执行健康检查"
}

# 主函数
function Main {
    switch ($Command) {
        'start' {
            if (-not (Test-Docker)) { exit 1 }
            Test-EnvFile
            Build-Images
            Start-Services $Environment
            Log-Info "等待服务启动..."
            Start-Sleep 10
            Test-Health
            Log-Success "部署完成! 访问 http://localhost 查看应用"
        }
        'stop' {
            Stop-Services
        }
        'restart' {
            Stop-Services
            Start-Services $Environment
        }
        'build' {
            if (-not (Test-Docker)) { exit 1 }
            Build-Images
        }
        'status' {
            Show-Status
        }
        'logs' {
            Show-Logs $Service
        }
        'health' {
            Test-Health
        }
        'cleanup' {
            Remove-Resources
        }
        'help' {
            Show-Help
        }
        default {
            Log-Error "未知命令: $Command"
            Show-Help
            exit 1
        }
    }
}

# 执行主函数
Main
