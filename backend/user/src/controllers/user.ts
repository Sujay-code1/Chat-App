import TryCatch from '../config/TryCatch.js'
import { get, set, del } from '../config/cache.js'
import { publishToQueue } from '../config/rabbitmq.js'
import {User} from "../model/User.js"
import { generateToken } from '../config/generateToken.js'
import type { AuthenticatedRequest } from '../middleware/isAuth.js'
import jwt from 'jsonwebtoken'

const INVITE_TOKEN_PURPOSE = 'friend-invite'

export const createInvite = TryCatch(async(req: AuthenticatedRequest, res) => {
    const inviterId = req.user?._id?.toString()
    const secret = process.env.JWT_SECRET

    if (!inviterId) {
        res.status(401).json({ message: "Please log in to create an invite" })
        return
    }
    if (!secret) {
        res.status(500).json({ message: "Server JWT secret not configured" })
        return
    }

    const inviteToken = jwt.sign(
        { purpose: INVITE_TOKEN_PURPOSE, inviterId },
        secret,
        { expiresIn: '30d' },
    )
    res.status(201).json({ inviteToken })
})

export const loginUser = TryCatch(async(req, res) => {
    const { email } = req.body

    const rateLimitKey = `otp:ratelimit:${email}`
    const rateLimit = await get(rateLimitKey)
    if (rateLimit) {
        res.status(429).json({
            message: "Too many request. please wait before requesting new otp"
        })
        return
    }
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpKey = `otp:${email}`
    await set(otpKey, otp, { EX: 300 })
    await set(rateLimitKey, 'true', { EX: 60 })

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
    const{email, otp:enteredOtp, inviteToken} = req.body;

    if(!email || !enteredOtp){
        res.status(400).json({
            message:"Email and OTP are required"
        })
        return
    }

    let inviterId: string | undefined
    if (inviteToken !== undefined) {
        const secret = process.env.JWT_SECRET
        if (!secret || typeof inviteToken !== 'string') {
            res.status(400).json({ message: "Invalid invite link" })
            return
        }
        try {
            const invite = jwt.verify(inviteToken, secret)
            if (
                typeof invite !== 'object' ||
                invite.purpose !== INVITE_TOKEN_PURPOSE ||
                typeof invite.inviterId !== 'string'
            ) {
                res.status(400).json({ message: "Invalid invite link" })
                return
            }
            inviterId = invite.inviterId
        } catch {
            res.status(400).json({ message: "This invite link is invalid or has expired" })
            return
        }
    }

    const otpKey = `otp:${email}`
    const storedOtp = await get(otpKey)
    if(!storedOtp || enteredOtp !== storedOtp){
        return res.status(400).json({
            message: "Invalid OTP"
        })
    }

    await del(otpKey)

    let user = await User.findOne({ email })

    if(!user){
        const name = email.slice(0, 8)
        user = await User.create({ name, email })
    }

    // generateToken should be defined/imported elsewhere in the project
    // if it's missing, this will throw; ensure generateToken is available
    const token = generateToken(user)

    return res.status(200).json({
        message: "User verified",
        token,
        user,
        ...(inviterId && inviterId !== user._id.toString() ? { inviterId } : {}),
    }) 

})

export const myProfile = TryCatch(async(req: AuthenticatedRequest, res)=>{
   const user = req.user

   res.json(user); 
})


export const updateName = TryCatch(async(req: AuthenticatedRequest, res)=>{
    const user = await User.findById(req.user?._id)
    if(!user){
        return res.status(400).json({
            message: "please login"
        })
        return
    }

    user.name = req.body.name || user.name
    await user.save();
    const token = generateToken(user);

    res.json({
        message:"user updated",
        user,
        token
    })
})


export const getAllUsers = TryCatch(async(req: AuthenticatedRequest, res)=>{
    const users = await User.find()
    res.json(users)
})

export const getAUser = TryCatch(async(req, res)=>{
    const user = await User.findById(req.params.id);

    res.json(user)
})