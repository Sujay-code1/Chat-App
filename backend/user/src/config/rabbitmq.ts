import amqp from "amqplib";
import dotenv from "dotenv";

dotenv.config();

let channel: amqp.ConfirmChannel | null = null;
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

    const confirmChannel = await connection.createConfirmChannel();
    channel = confirmChannel;

    connection.on("close", () => {
      channel = null;
      console.error("RabbitMQ connection closed");
    });
    connection.on("error", (error) => {
      console.error("RabbitMQ connection error:", error.message);
    });

    console.log("Connected to RabbitMQ");
  } catch (error) {
    console.error("Failed to connect to RabbitMQ:", error);
    throw error;
  }
};

export const publishToQueue = async(queueName: string, message:any) =>{
  const activeChannel = channel;
  if(!activeChannel){
    throw new Error("RabbitMQ is not connected; OTP message was not queued");
  }

  await activeChannel.assertQueue(queueName, {durable: true});
  await new Promise<void>((resolve, reject) => {
    activeChannel.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(message)),
      { persistent: true },
      (error) => {
        if (error) reject(error);
        else resolve();
      },
    );
  });
}