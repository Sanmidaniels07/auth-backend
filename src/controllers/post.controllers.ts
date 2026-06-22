import {Request, Response } from "express";
import { AuthRequest } from "../middleware/auth-middleware";
import { createPostService, deletePostService, getDeletedPostsService, getPostsService, getSinglePostService, restorePostService, updatePostService } from "../services/post.services";
import { apiResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandlers";
import { AppError } from "../utils/appError";


export const createPost = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const post = await createPostService(
      req.user.id,
      req.body
    );

    res.status(201).json(
      apiResponse(
        post,
        "Post created successfully"
      )
    );
  }
);
export const getPosts = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const search = req.query.search as string;
    const authorId = req.query.authorId as string;
    const sort = req.query.sort as string;

    const result = await getPostsService(
      page,
      limit,
      search,
      authorId,
      sort
    );

    res.status(200).json(
      apiResponse(
        result,
        "Posts fetched successfully"
      )
    );
  }
);

export const getSinglePost = asyncHandler(
  async (req: Request, res: Response) => {
    const postId = Number(req.params.id);

    const post = await getSinglePostService(
      postId
    );

    res.status(200).json(
      apiResponse(
        post,
        "Post fetched successfully"
      )
    );
  }
);


export const updatePost = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const postId = Number(req.params.id);

    const post = await updatePostService(
      postId,
      req.user.id,
      req.body
    );

    res.status(200).json(
      apiResponse(
        post,
        "Post updated successfully"
      )
    );
  }
);


export const deletePost = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const postId = Number(req.params.id);

    await deletePostService(
      postId,
      req.user.id
    );

    res.status(200).json(
      apiResponse(
        null,
        "Post deleted successfully"
      )
    );
  }
);

export const restorePost = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (req.user.role !== "ADMIN") {
      throw new AppError(
        "Only admins can restore posts",
        403
      );
    }

    const postId = Number(req.params.id);

    const post = await restorePostService(
      postId
    );

    res.status(200).json(
      apiResponse(
        post,
        "Post restored successfully"
      )
    );
  }
);


export const getDeletedPosts = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (req.user.role !== "ADMIN") {
      throw new AppError(
        "Only admins can view deleted posts",
        403
      );
    }

    const posts = await getDeletedPostsService();

    res.status(200).json(
      apiResponse(
        posts,
        "Deleted posts fetched successfully"
      )
    );
  }
);