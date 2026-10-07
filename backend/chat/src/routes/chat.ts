import express from 'express';
import isAuth from "../middleware/isAuth.js"
import {createInvitedChat, createNewChat, getAllChats, getPendingMessages, sendMessage, getMessagesByChat, updateContactName } from "../controllers/chat.js"
import {upload} from "../middleware/multer.js"

const router = express.Router();

router.post("/chat/new", isAuth, createNewChat)
router.post("/chat/invited", isAuth, createInvitedChat)
router.get("/chat/all", isAuth, getAllChats)
router.patch("/chat/:chatId/contact-name", isAuth, updateContactName)
router.get("/message/pending", isAuth, getPendingMessages)
router.post("/message", isAuth, upload.single('image'), sendMessage)
router.get("/message/:chatId", isAuth, getMessagesByChat)

export default router;
