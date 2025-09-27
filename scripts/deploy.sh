#!/bin/bash

# FileSystem Docker 部署脚本
# 使用方法: ./scripts/deploy.sh [dev|prod]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查Docker是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
}

# 检查环境变量文件
check_env_file() {
    if [[ ! -f .env.docker ]]; then
        log_warning "环境变量文件 .env.docker 不存在"
        if [[ -f env.docker.example ]]; then
            log_info "复制示例环境变量文件..."
            cp env.docker.example .env.docker
            log_warning "请编辑 .env.docker 文件并设置正确的配置值"
            log_info "特别注意修改以下配置："
            echo "  - SESSION_SECRET"
            echo "  - JWT_SECRET"
            echo "  - REDIS_PASSWORD"
            echo "  - FRONTEND_URL"
            read -p "按回车键继续..."
        else
            log_error "环境变量示例文件不存在"
            exit 1
        fi
    fi
}

# 构建镜像
build_images() {
    log_info "构建 Docker 镜像..."
    
    if docker compose version &> /dev/null; then
        docker compose build --no-cache
    else
        docker-compose build --no-cache
    fi
    
    log_success "镜像构建完成"
}

# 启动服务
start_services() {
    local env_mode=$1
    
    log_info "启动服务 (模式: $env_mode)..."
    
    if docker compose version &> /dev/null; then
        docker compose --env-file .env.docker up -d
    else
        docker-compose --env-file .env.docker up -d
    fi
    
    log_success "服务启动成功"
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    
    if docker compose version &> /dev/null; then
        docker compose down
    else
        docker-compose down
    fi
    
    log_success "服务已停止"
}

# 查看服务状态
show_status() {
    log_info "服务状态:"
    
    if docker compose version &> /dev/null; then
        docker compose ps
    else
        docker-compose ps
    fi
}

# 查看日志
show_logs() {
    local service=$1
    
    if [[ -n $service ]]; then
        log_info "查看 $service 服务日志:"
        if docker compose version &> /dev/null; then
            docker compose logs -f $service
        else
            docker-compose logs -f $service
        fi
    else
        log_info "查看所有服务日志:"
        if docker compose version &> /dev/null; then
            docker compose logs -f
        else
            docker-compose logs -f
        fi
    fi
}

# 清理资源
cleanup() {
    log_warning "清理 Docker 资源..."
    
    if docker compose version &> /dev/null; then
        docker compose down -v --rmi all
    else
        docker-compose down -v --rmi all
    fi
    
    log_success "资源清理完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 检查后端健康状态
    local backend_health=$(curl -s http://localhost:3000/health | jq -r '.status' 2>/dev/null || echo "error")
    if [[ "$backend_health" == "ok" ]]; then
        log_success "后端服务健康 ✓"
    else
        log_error "后端服务异常 ✗"
    fi
    
    # 检查前端访问
    local frontend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80 2>/dev/null || echo "000")
    if [[ "$frontend_status" == "200" ]]; then
        log_success "前端服务正常 ✓"
    else
        log_error "前端服务异常 ✗"
    fi
    
    # 检查Redis连接
    if docker exec file-system-redis redis-cli ping &>/dev/null; then
        log_success "Redis服务正常 ✓"
    else
        log_warning "Redis服务异常 ✗"
    fi
}

# 显示帮助信息
show_help() {
    echo "FileSystem Docker 部署脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  start [dev|prod]  启动服务 (默认: dev)"
    echo "  stop              停止服务"
    echo "  restart [dev|prod] 重启服务"
    echo "  build             构建镜像"
    echo "  status            查看服务状态"
    echo "  logs [service]    查看日志"
    echo "  health            健康检查"
    echo "  cleanup           清理所有资源"
    echo "  help              显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start prod     # 生产环境启动"
    echo "  $0 logs api       # 查看后端日志"
    echo "  $0 health         # 执行健康检查"
}

# 主函数
main() {
    local command=${1:-help}
    local env_mode=${2:-dev}
    
    case $command in
        start)
            check_docker
            check_env_file
            build_images
            start_services $env_mode
            log_info "等待服务启动..."
            sleep 10
            health_check
            log_success "部署完成! 访问 http://localhost 查看应用"
            ;;
        stop)
            stop_services
            ;;
        restart)
            stop_services
            start_services $env_mode
            ;;
        build)
            check_docker
            build_images
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs $2
            ;;
        health)
            health_check
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
