import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import userRoutes from './routes/user.js'
import './config/redisClient.js'
import { connectRabbitMq } from "./config/rabbitmq.js";
import cors from "cors";



dotenv.config();
connectDb();
connectRabbitMq();


// Redis client is initialized by `src/config/redisClient.ts` (imported above)



const app = express();

app.use(express.json())

app.use(cors());

app.use("/api/v1", userRoutes);

const PORT = Number(process.env.PORT) || 8000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});