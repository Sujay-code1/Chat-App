import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import userRoutes from './routes/user.js'
import './config/redisClient.js'
import { connectRabbitMq } from "./config/rabbitmq.js";
import cors from "cors";



dotenv.config();


// Redis client is initialized by `src/config/redisClient.ts` (imported above)



const app = express();

app.use(express.json())

app.use(cors());

app.use("/api/v1", userRoutes);

// Basic health endpoint for readiness checks
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  await connectDb();
  await connectRabbitMq();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((error: unknown) => {
  console.error("Failed to start user service:", error);
  process.exit(1);
});