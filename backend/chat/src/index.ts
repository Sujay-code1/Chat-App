import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDb from './config/db.js';
import chatRoutes from './routes/chat.js'

dotenv.config();

connectDb();

const app = express();

app.use(express.json());

// Enable CORS for development (adjust origin in production)
app.use(cors({ origin: '*' }));

app.use("/api/v1", chatRoutes);

const port = Number(process.env.PORT) || 5002;

app.listen(port, () => {
    console.log(`Chat Server is running on port ${port}`);
});