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


export const sendMessage = TryCatch(async(req:AuthenticatedRequest, res)=>{
  const senderId = req.user?._id;
  const {chatId, text} = req.body;
  const imageFile = req.file;

  if(!senderId){
    res.status(401).json({
      message:"Either text or image is required",
    })
    return;
  }
  const chat = await Chat.findById(chatId)

  if(!chat){
    res.status(401).json({
      message:"Chat not found"
    })
    return;
  }
  const isUserInChat = chat.users.some(
    (userId)=>userId.toString() === senderId.toString()
  );

  if(!isUserInChat){
    res.status(403).json({
      message:"You are not participant of this chat"
    })
    return;
  }

  const otherUserId = chat.users.find(
    (userId)=>userId.toString() !== senderId.toString()
  )
  if(!otherUserId){
    res.status(401).json({
      message:"Other user not found"
    })
    return;
  }

  //socket setup

  let messageData: any = {
    chatId: chatId,
    sender: senderId,
    seen: false,
    seenAt: undefined,
  };

  if(imageFile){
    messageData.image = {
      url:imageFile.path,
      publicId:imageFile.filename
    };
     messageData.messageType = "image";
     messageData.text = text || "";
  }else{
    messageData.text = text
    messageData.messageType = "text";
  }

  const message = new Messages(messageData);

  const savedMessage = await message.save();

  const latestMessageText = imageFile? "📷 Image" : text

  await Chat.findByIdAndUpdate(chatId, {
    latestMessage:{
      text:latestMessageText,
      sender:senderId,
    },
    updatedAt: new Date(),
  },{new: true})

  //emit to sockets

  res.status(201).json({
    message:savedMessage,
    sender:senderId
  })
})


export const getMessagesByChat = TryCatch(
  async(req:AuthenticatedRequest, res)=>{
    const userId = req.user?._id;
    const {chatId} = req.params;

    if(!userId){
       res.status(401).json({
        message:"Unauthorized"
      })
      return;
    }

    if(!chatId){
      res.status(401).json({
        message:"ChatId is required"
      })
      return;
    }

    const chat = await Chat.findById(chatId);

    if(!chat){
      res.status(404).json({
        message:"chat not found"
      })
      return;
    }

     const isUserInChat = chat.users.some(
    (userId)=>userId.toString() === userId.toString()
  );

  if(!isUserInChat){
    res.status(403).json({
      message:"You are not participant of this chat"
    })
    return;
  }

  const messagesToMarkSeen = await Messages.find({
    chatId:chatId,
    sender:{$ne:userId},
    seen:false
  })

  await Messages.updateMany({
    chatId:chatId,
    sender:{$ne:userId},
    seen:false
  }, {
    seen:true,
    seenAt:new Date()
  })

  const messages = await Messages.find({chatId}).sort({
    createdAt:1
  })
  const otherUserId = chat.users.find((id)=> id.toString() !== userId.toString())
   
  try{
     const {data} = await axios.get(
            `${process.env.USER_SERVICES}/api/v1/user/${otherUserId}`
          )

          if(!otherUserId){
            res.status(404).json({
              message:"Other user not found"
            })
            return;
          }

          //socket working for seen messages

          res.json({
            messages,
            user:data,
          })
  }catch(error){
    console.log(error)
    res.json({
      messages,
      user:{_id: otherUserId, name:"unknown user"}
    })
  }

  }
)

