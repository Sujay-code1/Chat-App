import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "node:http";
import { Server } from "socket.io";
import connectDb from "./config/db.js";
import chatRoutes from "./routes/chat.js";
import { setSocketServer } from "./config/socket.js";
import { configureSocketServer } from "./config/socketServer.js";

dotenv.config();
connectDb();

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
app.use("/api/v1", chatRoutes);

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: corsOptions });
setSocketServer(io);
configureSocketServer(io);

const port = Number(process.env.PORT) || 5002;
httpServer.listen(port, () => {
  console.log(`Chat Server is running on port ${port}`);
});
