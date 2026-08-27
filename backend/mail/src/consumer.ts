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
                  throw new Error('Missing SMTP credentials. Set SMTP_USER and SMTP_PASS (or USER and PASSWORD) in your environment.')
                }

                const transporter = nodemailer.createTransport({
                  host: "smtp.gmail.com",
                  port: 465,
                  secure: true,
                  auth: {
                    user: smtpUser,
                    pass: smtpPass
                  }
                })

                await transporter.sendMail({
                  from: "Chat App <" + smtpUser + ">",
                  to,
                  subject,
                  text: body
                })
               
                  console.log(`OTP mail sent to ${to}`)
                  channel.ack(msg)
              } catch (error) {
                console.log("Failed to send OTP",error)
            }
        }
     })

  } catch (error) {
   console.log("Failed to start rabbitmq consumer",error)
   }
}

