import { OpenAI } from "openai";
import { MessageTypes, ChatTypes } from "../types/messageTypes";
import ChatHistory, { IChatHistory } from "../models/chatHistory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import configs from "../config/configs";
import { PineconeIndeices } from "../types/types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: configs.PINECONE_API_KEY });

export async function messageChat( prompt: string) {
    const chatType= ChatTypes.TEXT

    const recentChats: IChatHistory[] = await ChatHistory.find({ type: chatType })
        .sort({ createdAt: 1 })  
        .limit(15);

    const messages: any= [];

    messages.push({ role: MessageTypes.SYSTEM, content: "Thank you for your continued engagement!" });

    recentChats.forEach(chat => {
        if (chat.role !== MessageTypes.FILE) {
            messages.push({ role: chat.role, content: chat.content });
        }
    });

    messages.push({ role: MessageTypes.USER, content: `${prompt}. make your response in markdown` });

    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: 200,
    });

    const responseContent = completion.choices[0].message.content;

    const userMessage = new ChatHistory({
        role: MessageTypes.USER,
        type: chatType,
        content: prompt,
    });
    await userMessage.save();

    const assistantMessage = new ChatHistory({
        role: MessageTypes.ASSISTANT,
        type: chatType,
        content: responseContent,
    });
    await assistantMessage.save();

    return responseContent;
}



export async function chatWithPDF(query: string) {
    const queryEmbedding = await new OpenAIEmbeddings().embedQuery(query);
    
    let queryResponse = await pinecone.index(PineconeIndeices.DOCUMENT_QA_SYSTEM).query({
        vector: queryEmbedding,
        topK: 3,
        includeMetadata: true,
    });

    const concatenatedText = queryResponse.matches
        .map((match: any) => `chunk: ${match.metadata.chunk}- entities:${match.metadata.entities}`)
        .join(" ");

    const recentChats: IChatHistory[] = await ChatHistory.find({ type: ChatTypes.PDF })
        .sort({ createdAt: 1 }) 
        .limit(15);

    const messages: any = [];

    messages.push({ role: MessageTypes.SYSTEM, content: "Thank you for your continued engagement!" });

    recentChats.forEach(chat => {
        if (chat.role !== MessageTypes.FILE) {
            messages.push({ role: chat.role, content: chat.content });
        }
    });
    messages.push({ role: MessageTypes.USER, content: `Don't start your response with Based on the provided context. give me just the answer ${query} context:${concatenatedText}.` });

    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: 200,
    });

    const responseContent = completion.choices[0].message.content;

    const userMessage = new ChatHistory({
        role: MessageTypes.USER,
        type: ChatTypes.PDF,
        content: query,
    });
    await userMessage.save();

    const assistantMessage = new ChatHistory({
        role: MessageTypes.ASSISTANT,
        type: ChatTypes.PDF,
        content: responseContent,
    });
    await assistantMessage.save();

    return responseContent;
}