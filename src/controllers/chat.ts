import { Request, Response, NextFunction } from "express";
import vectorizationService from "../services/vectorizationService"; // Your main service function
import { chatWithPDF, messageChat } from "../services/chatService";
import { ChatTypes, MessageTypes } from "../types/messageTypes";
import { BaseResponse } from "../types/baseResponse";
import ChatHistory from "../models/chatHistory";

export const processPdfController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { prompt, type } = req.body;
    if (req.file) {
      const pdfPath: string = req.file.path;
      await vectorizationService(pdfPath);
      const savedFile = new ChatHistory({
        role: MessageTypes.FILE,
        type: ChatTypes.PDF,
        content: req.file.originalname,
      });
      await savedFile.save();
    }
    let result = "";
    if (type == ChatTypes.TEXT) {
      result = (await messageChat(prompt)) || "";
    } else {
      result = (await chatWithPDF(prompt)) || "";
    }

    res.status(200).json({
      success: true,
      message: "PDF processed successfully!",
      data: { result },
    });
  } catch (error) {
    next(error);
  }
};

const fetchChatHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { type } = req.query;

    if (!type || (type !== "text" && type !== "pdf")) {
      const error = new Error(
        "Invalid or missing type query parameter. Must be 'text' or 'pdf'"
      );
      (error as any).statusCode = 400;
      throw error;
    }

    const chatHistory = await ChatHistory.find({ type: type.toString() }).sort({
      createdAt: 1,
    });

    let baseResponse = new BaseResponse();
    baseResponse.success = true;
    baseResponse.message = "Chat history retrieved successfully!";
    baseResponse.data = {
      chatHistory,
    };

    return res.status(200).json({ ...baseResponse });
  } catch (error) {
    next(error);
  }
};
const chatController = {
  processPdfController,
  fetchChatHistory,
};

export default chatController;
