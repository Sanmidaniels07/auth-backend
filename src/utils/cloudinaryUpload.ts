import { MediaType } from "@prisma/client";

import cloudinary from "../config/cloudinary";

interface UploadResult {
  url: string;
  type: MediaType;
}

export const uploadBufferToCloudinary = (
  buffer: Buffer,
  mimetype: string
): Promise<UploadResult> => {
  const isVideo = mimetype.startsWith("video/");

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: isVideo ? "video" : "image",
        folder: "nestly/posts",
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error("Upload failed."));
        }

        resolve({
          url: result.secure_url,
          type: isVideo ? MediaType.VIDEO : MediaType.IMAGE,
        });
      }
    );

    uploadStream.end(buffer);
  });
};