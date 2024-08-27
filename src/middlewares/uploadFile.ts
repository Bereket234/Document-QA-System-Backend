import multer, { FileFilterCallback } from "multer";
import path from "path";
import { Request, Response, NextFunction } from "express";
import { MulterError } from "multer";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(
      new MulterError(
        "LIMIT_UNEXPECTED_FILE",
        "Invalid file type. Only PDF files are allowed."
      )
    );
  }
};

const upload = multer({ storage, fileFilter });

export const uploadMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const uploadSingle = upload.single("file");

  uploadSingle(req, res, (err: any) => {
    if (err instanceof MulterError) {
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      console.log(err);

      return next(err);
    }
    next();
  });
};
