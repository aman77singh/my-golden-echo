import { cloudinary } from "../config/cloudinary.js";
import { env } from "../config/env.js";
import { AuthUser, CloudinarySignedUploadResponse } from "../types/shared.js";
import { BadRequestError } from "../utils/errors.js";

export class MediaService {
  /**
   * Generate signature for client direct upload to Cloudinary
   */
  static generateUploadSignature(currentUser: AuthUser, customFolder?: string): CloudinarySignedUploadResponse {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = customFolder || `our-space/couples/${currentUser.coupleId}`;

    const paramsToSign: Record<string, string | number> = {
      folder,
      timestamp,
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

    return {
      signature,
      timestamp,
      apiKey: env.CLOUDINARY_API_KEY,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      folder,
    };
  }

  /**
   * Upload audio buffer directly to Cloudinary (for voice notes)
   */
  static async uploadVoiceBuffer(
    currentUser: AuthUser,
    buffer: Buffer,
    mimeType = "audio/webm"
  ): Promise<{ voiceUrl: string; duration?: number }> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestError("Voice audio buffer is empty.");
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `our-space/couples/${currentUser.coupleId}/voice`,
          resource_type: "video", // Cloudinary handles audio files under 'video'
          format: mimeType.includes("mp4") || mimeType.includes("m4a") ? "mp4" : "webm",
        },
        (error, result) => {
          if (error || !result) {
            reject(new BadRequestError(`Voice upload failed: ${error?.message || "Unknown error"}`));
            return;
          }
          resolve({
            voiceUrl: result.secure_url,
            duration: result.duration,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }
}
