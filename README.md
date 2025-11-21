# 🦾 Next.js + Puppeteer on Ubuntu Server

This project is a **Next.js app** bootstrapped with `create-next-app`.
It includes **Puppeteer** for web crawling. On headless Ubuntu servers, Puppeteer needs a virtual display (**Xvfb**) when using `headless: false`.

---

# 🚀 Development (Local)

Run the development server locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

---

# 🧩 Production Build & Run on Ubuntu Server

If you’re running on an Ubuntu server (no GUI), Puppeteer requires a virtual display.

## 1️⃣ Install dependencies (once)

```bash
sudo apt update
sudo apt install -y xvfb
npm install
```

## 2️⃣ Build the project

```bash
npm run build
```

## 3️⃣ Start the virtual display (Xvfb)

```bash
Xvfb :99 -screen 0 1280x1024x24 &
export DISPLAY=:99
```

Verify Xvfb:

```bash
ps aux | grep Xvfb
```

## 4️⃣ Run with PM2

```bash
DISPLAY=:99 pm2 start npm --name "system" -- run start
```

## 5️⃣ Check logs

```bash
pm2 logs system
```

## 6️⃣ Auto-start on reboot (optional)

```bash
pm2 startup
pm2 save
```

If server reboots, you must start Xvfb again unless automated.

Example startup script:

```bash
Xvfb :99 -screen 0 1280x1024x24 &
export DISPLAY=:99
pm2 resurrect
```

---

# 🗑️ Automatic Cleanup of Uploaded Images (Cron Job)

If your app stores images in `public/uploads/`, you may want to **automatically delete files older than 7 days**.

## ⏰ Server Timezone

Your server uses:

```
UTC (Etc/UTC)
```

Việt Nam (UTC+7)  →  Server UTC difference = **+7 hours**.

So to run cleanup at **03:00 AM Vietnam time**, set cron to run at **20:00 UTC (8 PM) the previous day)**.

---

# 🧹 7-Day Auto Cleanup Script (Cron)

### 1️⃣ Open crontab

```bash
crontab -e
```

### 2️⃣ Add rule to delete files older than 7 days

```bash
0 20 * * * find /var/www/your-app/public/uploads -type f -mtime +7 -delete
```

### 3️⃣ (Optional) Delete empty folders

```bash
5 20 * * * find /var/www/your-app/public/uploads -type d -empty -delete
```

### Schedule Explanation

* Cron runs on **UTC**, not Vietnam time.
* 20:00 UTC = 03:00 AM Vietnam.
* `-mtime +7` = delete files older than 7 days.

---

# 🔗 Additional Resources

* Next.js Documentation
* Puppeteer Troubleshooting
* PM2 Docs

---

Feel free to expand the script section if you want automatic logging, email reports, or rotation!
