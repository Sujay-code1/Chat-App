import mongoose, {Document, Schema, Types} from 'mongoose';

export interface IMessage extends Document{
    chatId: Types.ObjectId;
    sender:string;
    text?:string;
    image?:{
        url:string;
        publicId:string;
    };
    messageType: "text" | "image";
    kind?: "user" | "invite-welcome";
    deliveredAt?: Date | null;
    seen:boolean;
    seenAt?:Date;
    createdAt:Date;
    updatedAt:Date;
}

const schema = new Schema<IMessage>(
    {
  chatId:{
    type:Schema.Types.ObjectId,
    ref:"Chat",
    required:true,
  },
  sender:{
    type:String,
    required:true
  },

  text:String,
  image:{
    url:String,
    publicId:String,
  },

  messageType:{
    type:String,
    enum:["text", "image"],
    default:"text"

  },
  kind:{
    type:String,
    enum:["user", "invite-welcome"],
    default:"user",
  },
  deliveredAt:{
    type:Date,
    default:null,
  },

  seen:{
    type:Boolean,
    default:false,

  },

  seenAt:{
    type:Date,
    default:null,
  },
},
{
    timestamps:true
}
)

schema.index(
  { chatId: 1, kind: 1 },
  { unique: true, partialFilterExpression: { kind: "invite-welcome" } },
);

export const  Messages = mongoose.model<IMessage>("Messages", schema);