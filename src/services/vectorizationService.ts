import fs from "fs";
import pdfParse from "pdf-parse";
import { Pinecone } from "@pinecone-database/pinecone";

import { OpenAIEmbeddings } from "@langchain/openai";
import OpenAI from "openai";
import configs from "../config/configs";
import { PineconeIndeices } from "../types/types";

const pc = new Pinecone({
  apiKey: configs.PINECONE_API_KEY || "",
});

const indexName = PineconeIndeices.DOCUMENT_QA_SYSTEM;
const dimension = 1536;

async function vectorizationService(pdfPath: string) {
  const text = await extractTextFromPDF(pdfPath);

  const sentences = extractSentences(text);

  const sentencesEmbedings = await generateEmbeddings(sentences);

  const chunks = segmentSentences(sentences, sentencesEmbedings);

  const chunkEmbedings = await generateEmbeddings(chunks);

  await createIndexIfNotExists(indexName, dimension);

  await saveEmbeddingsToPinecone(chunks, chunkEmbedings);
}

async function saveEmbeddingsToPinecone(
  chunks: String[],
  embeddings: number[][]
) {
  const index = pc.Index(indexName);

  const vectorsToUpsert: any = await Promise.all(
    chunks.map(async (chunk, i) => {
      const metadata = {
        chunk: chunk,
        entities: await extractEntities(chunk),
      };
      return {
        id: `chunk-${i + 1}`,
        values: embeddings[i],
        metadata: metadata,
      };
    })
  );

  await index.upsert(vectorsToUpsert);
}

async function createIndexIfNotExists(indexName: string, dimension = 15) {
  const existingIndexes = await pc.listIndexes();
  let indexExists = false;
  if (existingIndexes && existingIndexes.indexes) {
    indexExists = existingIndexes.indexes.some(
      (index: any) => index.name === indexName
    );
  }

  if (!indexExists) {
    await pc.createIndex({
      name: indexName,
      dimension: dimension,
      metric: "cosine",
      spec: {
        serverless: {
          cloud: "aws",
          region: "us-east-1",
        },
      },
    });
  }
}

async function extractEntities(chunk: String) {
  const prompt = `Extract all named entities from the following text and categorize them as PERSON, ORGANIZATION, LOCATION, DATE, etc.:\n\n${chunk}\n\nEntities:`;
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  });
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      {
        role: "user",
        content: `Extract all named entities from the following text and categorize them as PERSON, ORGANIZATION, LOCATION, DATE, etc.:\n\n${chunk}\n\nEntities:`,
      },
    ],
  });

  const content = response.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("No content found in OpenAI response.");
  }

  return content;
}

async function extractTextFromPDF(pdfPath: string) {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

function extractSentences(input: String) {
  const text = input.replace(/\n/g, "");
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [];

  if (sentences.length === 0) {
    return [];
  }
  return sentences;
}

async function generateEmbeddings(text: string[]) {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
    batchSize: 100,
    model: "text-embedding-ada-002",
  });

  const textEmbeddings = await embeddings.embedDocuments(text);

  return textEmbeddings;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

function segmentSentences(
  sentences: string[],
  embeddings: number[][],
  threshold = 0.7
): string[] {
  const chunks = [];
  let currentChunk = [sentences[0]];

  for (let i = 1; i < sentences.length; i++) {
    const similarity = cosineSimilarity(embeddings[i - 1], embeddings[i]);

    if (similarity < threshold) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [sentences[i]];
    } else {
      currentChunk.push(sentences[i]);
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}

export default vectorizationService;
