import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT) || 3000;


const app = next({
  dev,
  hostname,
  port,
});

const handler = app.getRequestHandler();

app.prepare().then(async () => {
  const { startBlogCron } = await import("@/lib/blog/startBlogCron");
  startBlogCron();
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    socket.on("woo-progress", (payload) => io.emit("woo-progress", payload));
    socket.on("woo-error", (payload) => io.emit("woo-error", payload));
    socket.on("openai-progress", (payload) => io.emit("openai-progress", payload));
    socket.on("image-get-failed", (payload) => io.emit("image-get-failed", payload));
    socket.on("crawl-progress", (payload) => io.emit("crawl-progress", payload));
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});