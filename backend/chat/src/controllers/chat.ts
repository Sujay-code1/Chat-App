import TryCatch from '../config/TryCatch.js'
import type { AuthenticatedRequest } from '../middleware/isAuth.js'
import {Chat} from '../models/chat.js'
import {Messages} from '../models/messages.js'
import axios from 'axios';
import dotnv from 'dotenv'

export const createNewChat = TryCatch(
   async (req:AuthenticatedRequest, res)=>{
      const userId = req.user?._id;
      const { otherUserId } = req.body;

      if(!userId || !otherUserId){
        res.status(401).json({
            message:"Other userid is required"
        })
        return
      }
      const existingChat = await Chat.findOne({
        users:{$all: [userId, otherUserId], $size: 2}
      })
      if(existingChat){
        res.json({
            message:"Chat already exists",
            chatId: existingChat._id,
        })
        return
      }
      const newChat = await Chat.create({
        users:[userId, otherUserId]
      })

      res.status(201).json({
        message:"New Chat created",
        chatId: newChat._id
      })
   }
)

export const getAllChats = TryCatch(async (req:AuthenticatedRequest, res)=>{
  const userId = req.user?._id;
  if(!userId){
    res.status(400).json({
      message:"UserId missing"
    })
    return
  }
  const chats = await Chat.find({users:userId}).sort({updatedAt: -1})

  const chatWithUserData = await Promise.all(
    chats.map(async(chat)=>{
      const otherUserId = chat.users.find((id)=>id !== userId);

      const unseenCount = await Messages.countDocuments({
        chatId: chat._id,
        sender:{$ne: userId},
        seen:false,
      })

     
        try{
          const {data} = await axios.get(
            `${process.env.USER_SERVICES}/api/v1/user/${otherUserId}`
          )

          return{
            user:data,
            chat:{
              ...chat.toObject(),
              lastMessage: chat.lastMessage || null,
              unseenCount,
            }
          }
        }catch(error){
          console.log(error)
          return{
            user:{_id: otherUserId, name:"unknown user"},
            chat:{
              ...chat.toObject(),
              lastMessage: chat.lastMessage || null,
              unseenCount,
            }
          }
        }
      
     
    })
  )

  res.json({
    chats:chatWithUserData,
  })
})


export const sentMessage = TryCatch(async(req:AuthenticatedRequest, res)=>{
  const senderId = req.user?._id;
  const {chatId, text} = req.body;
  const imageFile = req.file;
})

