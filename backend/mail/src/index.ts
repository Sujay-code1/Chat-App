import express from 'express';
import dotenv from 'dotenv';
import {startSendOtpConsumer} from "./consumer.js"

dotenv.config();

const app = express()

startSendOtpConsumer()

const port = process.env.PORT || 8000;

app.listen(port, () => {
    console.log(`Mail service is running on port ${port}`)
})

