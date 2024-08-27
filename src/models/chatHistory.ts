import { Document, Schema, model } from "mongoose";
import { MessageTypes } from "../types/messageTypes";
import { ChatTypes } from "../types/messageTypes";   // Adjust the path to your actual enums

export interface IChatHistory extends Document {
    role: MessageTypes;
    type: ChatTypes;
    content: string;
}

const ChatHistorySchema: Schema<IChatHistory> = new Schema({
    role: {
        type: String,
        enum: Object.values(MessageTypes),
        required: [true, "Role is required"]
    },
    type: {
        type: String,
        enum: Object.values(ChatTypes),
        required: [true, "Type is required"]
    },
    content: {
        type: String,
        required: [true, "Content is required"]
    }
},
{
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
});

const ChatHistory = model<IChatHistory>("ChatHistory", ChatHistorySchema);

export default ChatHistory;
