import express, { Application, Request, Response, NextFunction } from "express";
import { BaseResponse } from "./types/baseResponse";
import errorHandler from "./middlewares/errorHandler";
import routes from "./routes";
import cors from "cors";

const app: Application = express();
app.use(cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/api/v1/chat", routes.chatRouter);

app.get("/", (req, res) => {
  let baseResponse = new BaseResponse();
  baseResponse.success = true;
  baseResponse.message = "Welcome Page!";
  baseResponse.data = {
    welcome: "Welcome to AI-Enhanced Document QA System Page!",
  };
  return res.status(200).json({ ...baseResponse });
});

// Error handling
app.use(errorHandler);

export const config = {
  api: {
    timeout: 30,
  },
};

export default app;
