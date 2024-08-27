import { Router } from "express";
import { uploadMiddleware } from "../middlewares/uploadFile";
import chatController from "../controllers/chat";

const router = Router();
router.post("/", uploadMiddleware, chatController.processPdfController);
router.get("/", chatController.fetchChatHistory);

export default router;
