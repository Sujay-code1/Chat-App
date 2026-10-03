import * as amqp from 'amqplib'
import type { ConsumeMessage } from 'amqplib'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config();

export const startSendOtpConsumer = async()=>{
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
     

    const channel = await connection.createChannel()

    const queueName = "send-otp"

    await channel.assertQueue(queueName, {durable:true})

     console.log("✅Mail Service Consumer Started")
     console.log(`Listening for RabbitMQ messages on queue: ${queueName}`)

      await channel.consume(queueName, async(msg: ConsumeMessage | null)=>{
        if(msg){
            try {
                const payload = JSON.parse(msg.content.toString())
                const {to, subject, body} = payload

                console.log(`Received queue message for ${to}`)
                console.log("Message payload:", payload)

                const smtpUser = process.env.SMTP_USER ?? process.env.USER
                const smtpPass = process.env.SMTP_PASS ?? process.env.PASSWORD ?? process.env.PASS

                if (!smtpUser || !smtpPass) {
                  console.error('Missing SMTP credentials. Set SMTP_USER and SMTP_PASS, or USER/PASSWORD/PASS in your environment.')
                  channel.nack(msg, false, false)
                  return
                }

                const transporter = nodemailer.createTransport({
                  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
                  port: Number(process.env.SMTP_PORT ?? 465),
                  secure: (process.env.SMTP_SECURE ?? 'true') === 'true',
                  auth: {
                    user: smtpUser,
                    pass: smtpPass
                  }
                })

                try {
                  console.log(`Attempting SMTP send to ${to} with subject: ${subject}`)
                  await transporter.sendMail({
                    from: `${process.env.SMTP_FROM ?? 'Chat App <' + smtpUser + '>'}`,
                    to,
                    subject,
                    text: body
                  })
                  console.log(`OTP mail sent successfully to ${to}`)
                  channel.ack(msg)
                } catch (sendError) {
                  console.error('Failed to send OTP email:', sendError)
                  channel.nack(msg, false, false)
                }
              } catch (error) {
                console.log("Failed to parse or process OTP message", error)
                if (msg) {
                  channel.nack(msg, false, false)
                }
            }
        }
     })

  } catch (error) {
    console.error("Failed to start rabbitmq consumer", error)
    throw error
   }
}
