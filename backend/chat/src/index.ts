import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import connectDb from "./config/db.js";
import chatRoutes from "./routes/chat.js";
import { setSocketServer } from "./config/socket.js";
import { configureSocketServer } from "./config/socketServer.js";

dotenv.config();

const app = express();
const allowedOrigins = new Set(
  (process.env.CLIENT_URL ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, "")),
);
const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) => {
    const isLocalDevelopmentOrigin =
      process.env.NODE_ENV !== "production" &&
      Boolean(origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
    callback(
      null,
      !origin || allowedOrigins.has(origin) || isLocalDevelopmentOrigin,
    );
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() });
});
app.use("/api/v1", chatRoutes);

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: corsOptions });
setSocketServer(io);
configureSocketServer(io);

const port = Number(process.env.PORT) || 5002;

async function startServer() {
  await connectDb();

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const pubClient = createClient({ url: redisUrl });
    const subClient = pubClient.duplicate();
    pubClient.on("error", (error) => console.error("Chat Socket.IO Redis publisher error", error));
    subClient.on("error", (error) => console.error("Chat Socket.IO Redis subscriber error", error));
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Chat Socket.IO Redis adapter connected");
  } else {
    console.warn(
      "REDIS_URL is not configured; chat runs as a single instance without cross-instance Socket.IO events",
    );
  }

  httpServer.listen(port, () => {
    console.log(`Chat Server is running on port ${port}`);
  });
}

startServer().catch((error: unknown) => {
  console.error("Failed to start chat service:", error);
  process.exit(1);
});
