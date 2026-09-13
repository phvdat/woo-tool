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
  const { startYoutubeRetryCron } = await import("@/services/youtube/youtubeService");
  startYoutubeRetryCron();
  const { startProductSpyCron } = await import("@/services/product-spy/scheduler");
  startProductSpyCron();
  const httpServer = createServer(handler);

  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    socket.on("pipeline-progress", (payload) => io.emit("pipeline-progress", payload));
    socket.on("pipeline-error", (payload) => io.emit("pipeline-error", payload));
    socket.on("pipeline-finished", (payload) => io.emit("pipeline-finished", payload));

    socket.on("crawl-progress", (payload) => io.emit("crawl-progress", payload));
    socket.on("crawl-error", (payload) => io.emit("crawl-error", payload));

    socket.on("video-progress", (payload) => io.emit("video-progress", payload));
    socket.on("video-completed", (payload) => io.emit("video-completed", payload));
    socket.on("video-error", (payload) => io.emit("video-error", payload));
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