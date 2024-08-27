import dotenv from "dotenv";
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PORT = process.env.PORT || 3000;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY|| "";
const MONGO_DB_URI = process.env.MONGO_DB_URI || "";

const configs = {
  OPENAI_API_KEY,
  PORT,
  PINECONE_API_KEY,
  MONGO_DB_URI,
};

export default configs;
