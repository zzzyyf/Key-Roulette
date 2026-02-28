# Key Roulette (轮盘调) - Self-Hosting Guide

Key Roulette is a professional metronome tool designed for musicians to practice randomized key changes. This guide explains how to host the application on your own Linux server.

## Prerequisites

- **Node.js**: Version 18.0.0 or higher.
- **npm**: Usually comes with Node.js.
- **Linux Server**: Any general distribution (Ubuntu, Debian, CentOS, etc.).

## Quick Start (Node.js)

1. **Clone or Upload**: Transfer the project files to your server.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Build the Application**:
   ```bash
   npm run build
   ```
4. **Start the Server**:
   ```bash
   npm start
   ```
   The app will be available at `http://your-server-ip:3000`.

## Production Hosting (Recommended)

For a robust production setup, it is recommended to use a process manager like **PM2** and a reverse proxy like **Nginx**.

### 1. Using PM2

PM2 ensures your app stays alive and restarts if it crashes.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the app
pm2 start server.js --name "key-roulette"

# If you need to change the port (e.g., to 8080)
PORT=8080 pm2 start server.js --name "key-roulette"

# Save the process list to restart on reboot
pm2 save
pm2 startup
```

### 2. Nginx Reverse Proxy

To serve the app on port 80 (HTTP) or 443 (HTTPS) with a domain name, use Nginx.

Example Nginx configuration (`/etc/nginx/sites-available/key-roulette`):

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

Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/key-roulette /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Environment Variables

You can customize the port by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## Features
- **Tempo Adjustable Metronome**: 40-240 BPM.
- **Random Key Rotation**: Change keys every X measures.
- **Key Categories**: Practice Majors, Minors, or All keys.
- **Prep Bar**: Optional lead-in measure for preparation.
- **Dual Theme**: Daylight and Night modes.
- **Multilingual**: Supports English and Simplified Chinese.

---
Crafted for musicians. Happy practicing!
