import prisma from "../prisma/prisma";

export const createCommentService = async (
  userId: string,
  postId: string,
  content: string
) => {
  return prisma.comment.create({
    data: {
      content,
      userId,
      postId,
    },
  });
};

export const getPostCommentsService =
  async (postId: string) => {
    return prisma.comment.findMany({
      where: {
        postId,
      },

      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  };