import { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandlers";
import { apiResponse } from "../../utils/apiResponse";
import {
  createCollectionService,
  deleteCollectionService,
  getPublicCollectionService,
  listMyCollectionsService,
  updateCollectionService,
} from "./collection.service";

export const listMyCollections = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(apiResponse(await listMyCollectionsService(req.user.id), "Collections fetched"));
});

export const createCollection = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json(apiResponse(await createCollectionService(req.user.id, req.body), "Collection created"));
});

export const updateCollection = asyncHandler(async (req: Request, res: Response) => {
  res
    .status(200)
    .json(apiResponse(await updateCollectionService(req.user.id, req.params.id as string, req.body), "Collection updated"));
});

export const deleteCollection = asyncHandler(async (req: Request, res: Response) => {
  await deleteCollectionService(req.user.id, req.params.id as string);
  res.status(200).json(apiResponse(null, "Collection deleted"));
});

export const getPublicCollection = asyncHandler(async (req: Request, res: Response) => {
  const collection = await getPublicCollectionService(req.params.store as string, req.params.slug as string);
  res.status(200).json(apiResponse(collection, "Collection fetched"));
});
