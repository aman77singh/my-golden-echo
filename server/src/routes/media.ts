import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { MediaService } from "../services/mediaService.js";
import { BadRequestError } from "../utils/errors.js";

export const mediaRouter = Router();

// Multer memory storage with 10MB file limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new BadRequestError("Only audio/voice files are allowed for voice upload."));
    }
  },
});

/**
 * POST /media/sign
 * Returns Cloudinary signed upload parameters for direct client upload
 */
mediaRouter.post("/sign", requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const signatureData = MediaService.generateUploadSignature(req.user!);
    res.status(200).json(signatureData);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /media/voice
 * Uploads voice buffer to Cloudinary with size limit
 */
mediaRouter.post(
  "/voice",
  requireAuth,
  upload.single("voice"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new BadRequestError("Audio file 'voice' is required.");
      }

      const result = await MediaService.uploadVoiceBuffer(
        req.user!,
        req.file.buffer,
        req.file.mimetype
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);
