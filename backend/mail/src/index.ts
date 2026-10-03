import express from 'express';
import dotenv from 'dotenv';
import {startSendOtpConsumer} from "./consumer.js"

dotenv.config();

const app = express()

const port = process.env.PORT || 8000;

startSendOtpConsumer()
  .then(() => {
    app.listen(port, () => {
      console.log(`Mail service is running on port ${port}`)
    })
  })
  .catch((error: unknown) => {
    console.error("Failed to start mail service:", error)
    process.exit(1)
  })
