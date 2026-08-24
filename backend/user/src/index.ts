import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import {createClient} from 'redis'
import userRoutes from './routes/user.js'
import { connectRabbitMq } from "./config/rabbitmq.js";

dotenv.config();
connectDb();
connectRabbitMq();

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL is not defined in the environment variables");
}

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.connect()
.then(()=> console.log('Redis client connected'))
.catch((err) => {
  console.error("Redis connection failed:");
  console.error(err);
});

const app = express();

app.use("api/v1", userRoutes);

const PORT = Number(process.env.PORT) || 8000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});