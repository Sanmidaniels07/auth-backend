import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import { AppError } from "../../utils/appError";
import { uploadBufferToCloudinary } from "../../utils/cloudinaryUpload";

export const uploadMedia = asyncHandler(
  async (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[]) || [];

    if (files.length === 0) {
      throw new AppError("No files provided.", 400);
    }

    const uploads = await Promise.all(
      files.map((file) =>
        uploadBufferToCloudinary(file.buffer, file.mimetype)
      )
    );

    res.status(201).json(
      apiResponse(uploads, "Files uploaded successfully")
    );
  }
);