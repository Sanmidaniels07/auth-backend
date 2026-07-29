import { z } from "zod";
import { EventRsvpStatus } from "@prisma/client";

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2),
    description: z.string().trim().optional(),
    coverImage: z.string().trim().optional(),
    location: z.string().trim().optional(),
    startAt: z.coerce.date(),
    endAt: z.coerce.date().optional(),
  }),
});

export const listEventsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    scope: z.enum(["upcoming", "past", "all"]).optional(),
  }),
});

export const eventIdSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
});

export const rsvpSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    status: z.nativeEnum(EventRsvpStatus),
  }),
});

export const listAttendeesSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const updateEventSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    title: z.string().trim().min(2).optional(),
    description: z.string().trim().optional(),
    coverImage: z.string().trim().optional(),
    location: z.string().trim().optional(),
    startAt: z.coerce.date().optional(),
    endAt: z.coerce.date().optional(),
  }),
});

export const createEventCommentSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  body: z.object({
    content: z.string().trim().min(1),
  }),
});

export const listEventCommentsSchema = z.object({
  params: z.object({
    id: z.string(),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const eventCommentIdSchema = z.object({
  params: z.object({
    commentId: z.string(),
  }),
});