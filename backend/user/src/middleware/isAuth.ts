import type { IUser } from "../model/User.js";
import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import dotenv from 'dotenv';
import { User } from '../model/User.js';

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET as string | undefined;

export interface AuthenticatedRequest extends Request {
    user?: IUser | null;
}

export const isAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ message: 'Please provide a valid token' });
            return;
        }

        const token = authHeader.split(' ')[1];

      if (!JWT_SECRET) {
          res.status(500).json({ message: 'Server JWT secret not configured' });
          return;
      }

      const secret = JWT_SECRET;
      if (!secret) {
          res.status(500).json({ message: 'Server JWT secret not configured' });
          return;
      }

    const decodedValue = (jwt as any).verify(token, secret) as JwtPayload;

       if(!decodedValue || !decodedValue.user){
             res.status(401).json({ message: 'Invalid token' });
             return;
       }
    
       req.user = decodedValue.user;

       next()

    } catch (error) {
        res.status(500).json({ message: 'Please Login Jwt error' });
    }
};