import TryCatch from '../config/TryCatch.js'
import * as cache from '../config/cache.js'
import { publishToQueue } from '../config/rabbitmq.js'
import {User} from "../model/User.js"


export const loginUser = TryCatch(async(req, res) => {
    const { email } = req.body

    const rateLimitKey = `otp:ratelimit:${email}`
    const rateLimit = await cache.get(rateLimitKey)
    if (rateLimit) {
        res.status(429).json({
            message: "Too many request. please wait before requesting new otp"
        })
        return
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpKey = `otp:${email}`
    await cache.set(otpKey, otp, { EX: 300 })
    await cache.set(rateLimitKey, 'true', { EX: 60 })

    const message = {
        to: email,
        subject: "Your otp code",
        body: `your OTP is ${otp}. It is valid for 5 minutes`
    }

    await publishToQueue("send-otp", message)

    res.status(200).json({
        message: "OTP sent to your mail"
    })
})

export const verifyUser = TryCatch(async(req, res)=>{
    const{email, otp:enteredOtp} = req.body;

    if(!email || !enteredOtp){
        res.status(400).json({
            message:"Email and OTP are required"
        })
        return
    }
    const otpKey = `otp:${email}`
    const storedOtp = await cache.get(otpKey)
    if(!storedOtp || enteredOtp !== storedOtp){
        return res.status(400).json({
            message:"Invalid OTP"
        })
        return;
    }
   await redisClient.del(otpKey)
   let user = await User.findOne({email})

   if(!user){
    const name = email.slice(0, 8);
    user = await User.create({name, email})
   }

   
});