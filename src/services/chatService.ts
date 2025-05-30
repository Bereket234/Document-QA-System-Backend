import { OpenAI } from "openai";
import { MessageTypes, ChatTypes } from "../types/messageTypes";
import ChatHistory, { IChatHistory } from "../models/chatHistory";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";
import configs from "../config/configs";
import { PineconeIndeices } from "../types/types";
import { BufferMemory } from "langchain/memory";
import { PromptTemplate } from "@langchain/core/prompts";
import { ConversationChain, LLMChain } from "langchain/chains";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: configs.PINECONE_API_KEY });

const adPrompt = new PromptTemplate({
  template: `
  You are an expert ad copywriter.
  
  Conversation so far:
  {history}
  
  New Input:
  {input}
  
  Generate the following:
  - A catchy hook (1 sentence)
  - Ad creative (2-3 lines max)
  - Body text (around 50-75 words)
  
  Respond in this format:
  Hook: ...
  Ad Creative: ...
  Body Text: ...
  Make your response in markdown.
    `,
  inputVariables: ["history", "input"],
});

const model = new ChatOpenAI({
  temperature: 0.7,
  modelName: "gpt-3.5-turbo",
});

const memory = new BufferMemory({
  returnMessages: true,
  memoryKey: "history",
});

export const adChain = new ConversationChain({
  llm: model,
  memory,
  prompt: adPrompt,
});

export async function messageChat(prompt: string) {
  const chatType = ChatTypes.TEXT;

  const recentChats: IChatHistory[] = await ChatHistory.find({ type: chatType })
    .sort({ createdAt: 1 })
    .limit(15);
  const formattedHistory = recentChats.map((chat) => ({
    role: chat.role === MessageTypes.USER ? "user" : "assistant",
    content: chat.content,
  }));
  for (const msg of formattedHistory) {
    await adChain.memory?.saveContext(
      { input: msg.content }, 
      { output: "" }
    );
  }

  // Run chain with new user input
  const result = await adChain.call({ input: prompt });
  const responseContent = result.response;

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

// export async function chatWithPDF(query: string) {
//   const queryEmbedding = await new OpenAIEmbeddings().embedQuery(query);

//   let queryResponse = await pinecone
//     .index(PineconeIndeices.DOCUMENT_QA_SYSTEM)
//     .query({
//       vector: queryEmbedding,
//       topK: 3,
//       includeMetadata: true,
//     });

//   const concatenatedText = queryResponse.matches
//     .map(
//       (match: any) =>
//         `chunk: ${match.metadata.chunk}- entities:${match.metadata.entities}`
//     )
//     .join(" ");

//   const recentChats: IChatHistory[] = await ChatHistory.find({
//     type: ChatTypes.PDF,
//   })
//     .sort({ createdAt: 1 })
//     .limit(15);

//   const messages: any = [];

//   messages.push({
//     role: MessageTypes.SYSTEM,
//     content: "Thank you for your continued engagement!",
//   });

//   recentChats.forEach((chat) => {
//     if (chat.role !== MessageTypes.FILE) {
//       messages.push({ role: chat.role, content: chat.content });
//     }
//   });
//   messages.push({
//     role: MessageTypes.USER,
//     content: `Don't start your response with Based on the provided context. give me just the answer ${query} context:${concatenatedText}.`,
//   });

//   const completion = await openai.chat.completions.create({
//     model: "gpt-3.5-turbo",
//     messages: messages,
//     max_tokens: 200,
//   });

//   const responseContent = completion.choices[0].message.content;

//   const userMessage = new ChatHistory({
//     role: MessageTypes.USER,
//     type: ChatTypes.PDF,
//     content: query,
//   });
//   await userMessage.save();

//   const assistantMessage = new ChatHistory({
//     role: MessageTypes.ASSISTANT,
//     type: ChatTypes.PDF,
//     content: responseContent,
//   });
//   await assistantMessage.save();

//   return responseContent;
// }


export async function chatWithPDF(query: string) {
  const queryEmbedding = await new OpenAIEmbeddings().embedQuery(query);

  const queryResponse = await pinecone
    .index(PineconeIndeices.DOCUMENT_QA_SYSTEM)
    .query({
      vector: queryEmbedding,
      topK: 3,
      includeMetadata: true,
    });

  const concatenatedText = queryResponse.matches
    .map(
      (match: any) =>
        `chunk: ${match.metadata.chunk} - entities: ${match.metadata.entities}`
    )
    .join(" ");

  // Recent chat messages
  const recentChats = await ChatHistory.find({ type: ChatTypes.PDF })
    .sort({ createdAt: 1 })
    .limit(15);

  const messages = [];

  messages.push({
    role: MessageTypes.SYSTEM,
    content: "You're an expert ad copywriter. Create engaging marketing content based on the context and user prompt.",
  });

  recentChats.forEach((chat) => {
    if (chat.role !== MessageTypes.FILE) {
      messages.push({ role: chat.role, content: chat.content });
    }
  });

  // 🧠 LangChain Ad Copy Prompt
  const adPrompt = new PromptTemplate({
    template: `
You are an expert ad copywriter.

Given the following **product or business information** (from a PDF or user), generate:
- Hook (1 sentence)
- Ad Creative (2–3 lines)
- Body Text (50–75 words)

Context:
{context}

User Request:
{question}

Respond in this format:
Hook: ...
Ad Creative: ...
Body Text: ...
    `,
    inputVariables: ["context", "question"],
  });

  const model = new ChatOpenAI({
    temperature: 0.7,
    modelName: "gpt-3.5-turbo",
  });

  const chain = new LLMChain({
    llm: model,
    prompt: adPrompt,
  });

  const result = await chain.call({
    context: concatenatedText,
    question: query,
  });

  const responseContent = result.text;

  // Save chat history
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