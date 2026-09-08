import mongoose, {Document, Schema} from 'mongoose'

export interface IChat extends Document {
    users: string[];
    lastMessage?: {
        text: string,
        sender: string,
    }
    createdAt: Date;
    updatedAt: Date;
}

const schema: Schema<IChat> = new Schema(
    {
        users:[{ type: String, required: true }],
        lastMessage: {
            text: { type: String, default: '' },
            sender: { type: String, default: '' }
        }
    },
    { timestamps: true }
)

export const Chat = mongoose.model<IChat>('Chat', schema);