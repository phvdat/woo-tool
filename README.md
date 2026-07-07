# Next.js Automation System

Automation system for WooCommerce, Google Trends, AI Blog, and Puppeteer crawling.

---

## Requirements

* Node.js 22+
* Python 3.12+
* Google Chrome / Chromium
* Xvfb
* PM2

---

## Install

### Ubuntu packages

```bash
sudo apt update

sudo apt install -y \
python3 \
python3-venv \
python3-pip \
xvfb \
chromium-browser
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
.env.local
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
