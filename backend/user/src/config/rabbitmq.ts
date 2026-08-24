import amqp from "amqplib";
import dotenv from "dotenv";

dotenv.config();

let channel: amqp.Channel | null = null;

export const connectRabbitMq = async () => {
  try {
    const host = process.env.RABBITMQ_HOST ?? "localhost";
    const port = Number(process.env.RABBITMQ_PORT ?? 5672);
    const username = process.env.RABBITMQ_USERNAME ?? "guest";
    const password = process.env.RABBITMQ_PASSWORD ?? "guest";

    const connection = await amqp.connect({
      protocol: "amqp",
      hostname: host,
      port,
      username,
      password,
    });

    channel = await connection.createChannel();

    console.log("Connected to RabbitMQ");
  } catch (error) {
    console.error("Failed to connect to RabbitMQ:", error);
    throw error;
  }
};