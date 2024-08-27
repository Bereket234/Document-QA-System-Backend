import { OpenAIEmbeddings } from "@langchain/openai";

export async function generateEmbeddings(text: string[]) {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    batchSize: 100,
    model: "text-embedding-ada-002",
  });

  const textEmbeddings = await embeddings.embedDocuments(text);

  return textEmbeddings;
}