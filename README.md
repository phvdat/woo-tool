# Next.js Automation System

Automation system for WooCommerce, Google Trends, AI Blog, and Puppeteer crawling.

---

## Requirements

* Node.js 20+
* Python 3.12+
* Google Chrome / Chromium
* Xvfb
* PM2

---

## Install

### Ubuntu packages

```bash
sudo apt update

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install 20

nvm alias default 20
nvm use 20

npm install -g pm2
pm2 startup
pm2 save

sudo apt install -y \
python3 \
python3-venv \
python3-pip \
xvfb \
chromium-browser \
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

sudo mkdir -p /var/www/html/uploads

sudo chown -R ubuntu:ubuntu /var/www/html/uploads

sudo chmod -R 755 /var/www/html/uploads
```

> If `chromium-browser` is unavailable:

```bash
sudo apt install -y chromium
```

---

### Install Node packages

```bash
npm install
```

---

### Setup Python

Create virtual environment:

```bash
cd python
```

```bash
python3 -m venv .venv
```

Activate:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Deactivate:

```bash
deactivate
```

---

## Environment

Create

```text
.env
```

Fill your environment variables.

---

## Development

```bash
npm run dev
```

---

## Build

```bash
npm run build
```

---

## Start Xvfb

```bash
Xvfb :99 -screen 0 1280x1024x24 &
export DISPLAY=:99
```

Verify:

```bash
ps aux | grep Xvfb
```

---

## Run with PM2

```bash
DISPLAY=:99 pm2 start npm --name system -- run start
```

View logs:

```bash
pm2 logs system
```

Save PM2:

```bash
pm2 save
```

Auto start after reboot:

```bash
pm2 startup
```

---

# Ubuntu Cron

Open crontab

```bash
crontab -e
```

### Run Auto Blog every day at 09:00 UTC

```bash
0 9 * * * curl -X POST http://localhost:3000/api/blog/run
```

---

### Cleanup uploaded images older than 7 days

```bash
0 3 * * * find /var/www/your-project/public/uploads -type f -mtime +7 -delete
```

Delete empty folders:

```bash
5 3 * * * find /var/www/your-project/public/uploads -type d -empty -delete
```

---

## Restart Services

Restart Next.js

```bash
pm2 restart system
```

Restart Xvfb

```bash
pkill Xvfb

Xvfb :99 -screen 0 1280x1024x24 &
```

---
## Nginx Config

```code
server {
    listen 80;
    server_name woo.deveric.io.vn;

    client_max_body_size 100M;

    location /uploads/ {
        alias /var/www/html/uploads/;
        autoindex off;

        expires 30d;
        add_header Cache-Control "public, max-age=2592000";

        access_log off;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;

        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Project Structure

```text
project/
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── ...
├── python/
│   ├── .venv/
│   ├── requirements.txt
│   ├── google_trends.py
├── prompts/
├── public/
├── package.json
├── tsconfig.json
└── README.md
```
