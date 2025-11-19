🦾 Next.js + Puppeteer on Ubuntu Server

This project is a Next.js
 app bootstrapped with create-next-app
.
It includes Puppeteer for web crawling, which requires a virtual display (Xvfb) when running on headless Ubuntu servers.

🚀 Development (Local)

Run the development server locally:

npm run dev
# or
yarn dev


Open http://localhost:3000
 to see the result.

🧩 Production Build & Run on Ubuntu Server

If you’re running on an Ubuntu server (without GUI), Puppeteer needs a virtual display to work with headless: false.

1️⃣ Install dependencies (once)
sudo apt update
sudo apt install -y xvfb
npm install

2️⃣ Build the project
npm run build

3️⃣ Start the virtual display (Xvfb)
Xvfb :99 -screen 0 1280x1024x24 &
export DISPLAY=:99


💡 You can verify it's running:

ps aux | grep Xvfb

4️⃣ Run the app with PM2
DISPLAY=:99 pm2 start npm --name "system" -- run start


This ensures Puppeteer runs correctly even with headless: false.

5️⃣ Check logs
pm2 logs system

6️⃣ Auto-start on reboot (optional)
pm2 startup
pm2 save

📘 Notes

Always set export DISPLAY=:99 before running any Puppeteer-related process.

If you reboot the server, you must restart Xvfb or add it to your startup script.

Example of automatic startup:

Xvfb :99 -screen 0 1280x1024x24 &
export DISPLAY=:99
pm2 resurrect

🔗 Learn More

Next.js Documentation

Puppeteer Troubleshooting

PM2 Docs