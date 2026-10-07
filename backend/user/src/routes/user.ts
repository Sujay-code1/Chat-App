import express from 'express';
import { createInvite, loginUser, verifyUser, myProfile, getAllUsers, getAUser, updateName ,} from '../controllers/user.js';
import { isAuth } from '../middleware/isAuth.js';

const router = express.Router();

router.post("/login", loginUser)
router.post("/invite", isAuth, createInvite)
router.post("/verify", verifyUser)
router.get("/me", isAuth, myProfile)
router.get("/user/all", isAuth, getAllUsers)
router.get("/user/:id", isAuth, getAUser)
router.post("/update/user", isAuth, updateName)

export default router;