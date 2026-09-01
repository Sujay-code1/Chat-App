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

      channel.consume(queueName, async(msg: ConsumeMessage | null)=>{
        if(msg){
            try {
                const{to, subject, body} = JSON.parse(msg.content.toString())

                const smtpUser = process.env.SMTP_USER ?? process.env.USER
                const smtpPass = process.env.SMTP_PASS ?? process.env.PASSWORD

                if (!smtpUser || !smtpPass) {
                  console.error('Missing SMTP credentials. Set SMTP_USER and SMTP_PASS (or USER and PASSWORD) in your environment.')
                  // Reject the message so it can be retried or routed to a dead-letter queue
                  // Do not ack to allow visibility in the queue
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
                  await transporter.sendMail({
                    from: `${process.env.SMTP_FROM ?? 'Chat App <' + smtpUser + '>'}`,
                    to,
                    subject,
                    text: body
                  })
                  console.log(`OTP mail sent to ${to}`)
                  channel.ack(msg)
                } catch (sendError) {
                  console.error('Failed to send OTP email:', sendError)
                  // Nack without requeue to avoid infinite retry loops; adjust as needed
                  channel.nack(msg, false, false)
                }
              } catch (error) {
                console.log("Failed to send OTP",error)
            }
        }
     })

  } catch (error) {
   console.log("Failed to start rabbitmq consumer",error)
   }
}

