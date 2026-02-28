# 轮盘调 (Key Roulette) - 自托管指南

轮盘调是一款专业的节拍器工具，专为音乐人练习随机调性切换而设计。本指南将向您介绍如何在您自己的 Linux 服务器上托管此应用程序。

## 前提条件

- **Node.js**: 18.0.0 或更高版本。
- **npm**: 通常随 Node.js 一起安装。
- **Linux 服务器**: 任何通用发行版（Ubuntu、Debian、CentOS 等）。

## 快速开始 (Node.js)

1. **克隆或上传**: 将项目文件传输到您的服务器。
2. **安装依赖**:
   ```bash
   npm install
   ```
3. **构建应用程序**:
   ```bash
   npm run build
   ```
4. **启动服务器**:
   ```bash
   npm start
   ```
   应用程序将运行在 `http://您的服务器IP:3000`。

## 生产环境托管 (推荐)

为了获得更稳健的生产环境设置，建议使用 **PM2** 等进程管理器和 **Nginx** 等反向代理。

### 1. 使用 PM2

PM2 可确保您的应用持续运行，并在崩溃时自动重启。

```bash
# 全局安装 PM2
sudo npm install -g pm2

# 启动应用
pm2 start server.js --name "key-roulette"

# 保存进程列表以便在重启时自动启动
pm2 save
pm2 startup
```

### 2. Nginx 反向代理

要使用 80 端口 (HTTP) 或 443 端口 (HTTPS) 并通过域名访问应用，请使用 Nginx。

Nginx 配置示例 (`/etc/nginx/sites-available/key-roulette`):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用站点并重启 Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/key-roulette /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 环境变量

您可以通过设置 `PORT` 环境变量来自定义端口：

```bash
PORT=8080 npm start
```

## 功能特点
- **速度可调节拍器**: 40-240 BPM。
- **随机调性旋转**: 每隔 X 小节切换调性。
- **调性类别**: 练习大调、小调或所有调性。
- **预备小节**: 可选的起始预备小节。
- **双重主题**: 日间和夜间模式。
- **多语言支持**: 支持英文和简体中文。

---
专为音乐人打造。祝练习愉快！
