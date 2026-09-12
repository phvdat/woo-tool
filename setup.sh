#!/usr/bin/env bash

set -euo pipefail

# ============================================================
# Configuration
# ============================================================

APP_NAME="system"
DOMAIN="woo.deveric.io.vn"

PROJECT_DIR="/var/www/woo-tool"
APP_USER="${SUDO_USER:-$USER}"

NODE_VERSION="20"
DISPLAY_NUM="99"

UPLOAD_DIR="/var/www/html/uploads"

NGINX_CONFIG="/etc/nginx/sites-available/${DOMAIN}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"

# ============================================================
# Helpers
# ============================================================

log() {
    echo ""
    echo "============================================================"
    echo "$1"
    echo "============================================================"
}

run_as_app_user() {
    sudo -u "$APP_USER" -H bash -c "$1"
}

# ============================================================
# Check
# ============================================================

if [[ $EUID -eq 0 ]]; then
    echo "Please run this script as a normal user with sudo access."
    exit 1
fi

log "System information"

echo "User:        $APP_USER"
echo "Project:     $PROJECT_DIR"
echo "Domain:      $DOMAIN"
echo "Node:        $NODE_VERSION"
echo "Display:     :$DISPLAY_NUM"

# ============================================================
# Update Ubuntu
# ============================================================

log "Updating Ubuntu"

sudo apt update
sudo apt upgrade -y

# ============================================================
# Install system packages
# ============================================================

log "Installing system packages"

sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    ca-certificates \
    build-essential \
    software-properties-common \
    nginx \
    python3 \
    python3-venv \
    python3-pip \
    xvfb \
    ffmpeg \
    libnss3 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libasound2t64 \
    libgtk-3-0 \
    libxshmfence1 \
    fonts-liberation \
    xdg-utils

# ============================================================
# Verify installed software
# ============================================================

log "Checking installed software"

echo "Node:"
node --version 2>/dev/null || true

echo "Python:"
python3 --version

echo "FFmpeg:"
ffmpeg -version | head -n 1

echo "Nginx:"
nginx -v

echo "Xvfb:"
Xvfb -version 2>&1 | head -n 1 || true

# ============================================================
# Install NVM
# ============================================================

log "Installing NVM"

export NVM_DIR="$HOME/.nvm"

if [[ ! -d "$NVM_DIR" ]]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi

if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    source "$NVM_DIR/nvm.sh"
else
    echo "ERROR: NVM installation failed."
    exit 1
fi

# ============================================================
# Install Node.js
# ============================================================

log "Installing Node.js ${NODE_VERSION}"

nvm install "$NODE_VERSION"
nvm alias default "$NODE_VERSION"
nvm use "$NODE_VERSION"

echo "Node version:"
node --version

echo "NPM version:"
npm --version

# ============================================================
# Install PM2
# ============================================================

log "Installing PM2"

npm install -g pm2

pm2 --version

# ============================================================
# Create upload directory
# ============================================================

log "Creating upload directory"

sudo mkdir -p "$UPLOAD_DIR"

sudo chown -R "$APP_USER:$APP_USER" "$UPLOAD_DIR"

sudo chmod -R 755 "$UPLOAD_DIR"

# ============================================================
# Project directory
# ============================================================

log "Preparing project directory"

sudo mkdir -p "$PROJECT_DIR"

sudo chown -R "$APP_USER:$APP_USER" "$PROJECT_DIR"

# ============================================================
# Python virtual environment
# ============================================================

log "Setting up Python virtual environment"

if [[ ! -d "$PROJECT_DIR/python/.venv" ]]; then
    run_as_app_user "
        cd '$PROJECT_DIR/python'
        python3 -m venv .venv
    "
fi

run_as_app_user "
    cd '$PROJECT_DIR/python'
    source .venv/bin/activate
    python -m pip install --upgrade pip
"

if [[ -f "$PROJECT_DIR/python/requirements.txt" ]]; then
    run_as_app_user "
        cd '$PROJECT_DIR/python'
        source .venv/bin/activate
        pip install -r requirements.txt
    "
fi

# ============================================================
# Install Node dependencies
# ============================================================

log "Installing Node dependencies"

if [[ -f "$PROJECT_DIR/package.json" ]]; then

    run_as_app_user "
        export NVM_DIR='$HOME/.nvm'
        source '$HOME/.nvm/nvm.sh'

        cd '$PROJECT_DIR'

        npm install
    "

else
    echo "WARNING: package.json not found."
    echo "Make sure the project has been uploaded to:"
    echo "$PROJECT_DIR"
fi

# ============================================================
# Xvfb systemd service
# ============================================================

log "Configuring Xvfb"

sudo tee /etc/systemd/system/xvfb.service > /dev/null <<EOF
[Unit]
Description=Virtual X Framebuffer
After=network.target

[Service]
Type=simple
User=$APP_USER
Environment=DISPLAY=:$DISPLAY_NUM
ExecStart=/usr/bin/Xvfb :$DISPLAY_NUM -screen 0 1280x1024x24 -ac
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload

sudo systemctl enable xvfb
sudo systemctl restart xvfb

sleep 2

echo "Xvfb status:"
sudo systemctl --no-pager status xvfb | head -n 15

# ============================================================
# Nginx configuration
# ============================================================

log "Configuring Nginx"

sudo tee "$NGINX_CONFIG" > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;

    server_name $DOMAIN;

    client_max_body_size 100M;

    location /uploads/ {
        alias $UPLOAD_DIR/;

        autoindex off;

        expires 30d;

        add_header Cache-Control "public, max-age=2592000";

        access_log off;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;

        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 300;
        proxy_connect_timeout 60;
        proxy_send_timeout 300;
    }
}
EOF

# Remove default site

sudo rm -f /etc/nginx/sites-enabled/default

# Enable site

sudo ln -sf "$NGINX_CONFIG" "$NGINX_ENABLED"

# Test Nginx

sudo nginx -t

sudo systemctl enable nginx
sudo systemctl restart nginx

# ============================================================
# Build Next.js
# ============================================================

log "Building Next.js application"

if [[ -f "$PROJECT_DIR/package.json" ]]; then

    run_as_app_user "
        export NVM_DIR='$HOME/.nvm'
        source '$HOME/.nvm/nvm.sh'

        cd '$PROJECT_DIR'

        npm run build
    "

else
    echo "WARNING: package.json not found."
    echo "Skipping build."
fi

# ============================================================
# Stop old PM2 application
# ============================================================

log "Preparing PM2"

run_as_app_user "
    export NVM_DIR='$HOME/.nvm'
    source '$HOME/.nvm/nvm.sh'

    pm2 delete '$APP_NAME' 2>/dev/null || true
"

# ============================================================
# Start Next.js with PM2
# ============================================================

log "Starting Next.js with PM2"

run_as_app_user "
    export NVM_DIR='$HOME/.nvm'
    source '$HOME/.nvm/nvm.sh'

    cd '$PROJECT_DIR'

    DISPLAY=:$DISPLAY_NUM pm2 start npm \
        --name '$APP_NAME' \
        --time \
        -- run start
"

# ============================================================
# Save PM2
# ============================================================

log "Saving PM2 process list"

run_as_app_user "
    pm2 save
"

# ============================================================
# PM2 startup
# ============================================================

log "Configuring PM2 startup"

PM2_STARTUP=$(run_as_app_user "pm2 startup systemd -u '$APP_USER' --hp '$HOME'" | tail -n 1)

if [[ "$PM2_STARTUP" == sudo* ]]; then
    eval "$PM2_STARTUP"
fi

run_as_app_user "
    pm2 save
"

# ============================================================
# Final status
# ============================================================

log "Final status"

echo ""
echo "PM2:"
run_as_app_user "pm2 status"

echo ""
echo "Xvfb:"
sudo systemctl is-active xvfb

echo ""
echo "Nginx:"
sudo systemctl is-active nginx

echo ""
echo "Chromium:"
chromium --version

echo ""
echo "FFmpeg:"
ffmpeg -version | head -n 1

echo ""
echo "============================================================"
echo "SETUP COMPLETED"
echo "============================================================"
echo ""
echo "Domain:"
echo "  http://$DOMAIN"
echo ""
echo "Project:"
echo "  $PROJECT_DIR"
echo ""
echo "Uploads:"
echo "  $UPLOAD_DIR"
echo ""
echo "Display:"
echo "  :$DISPLAY_NUM"
echo ""
echo "PM2:"
echo "  pm2 status"
echo "  pm2 logs $APP_NAME"
echo ""
echo "Restart:"
echo "  pm2 restart $APP_NAME"
echo ""
echo "============================================================"