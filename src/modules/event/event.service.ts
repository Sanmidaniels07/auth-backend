import { EventRsvpStatus } from "@prisma/client";

import prisma from "../../prisma/prisma";
import { AppError } from "../../utils/appError";

interface CreateEventInput {
  title: string;
  description?: string;
  coverImage?: string;
  location?: string;
  startAt: Date;
  endAt?: Date;
}

const ATTENDEE_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  avatar: true,
};

export const createEventService = async (
  userId: string,
  data: CreateEventInput
) => {
  return prisma.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: { ...data, creatorId: userId },
    });

    await tx.eventAttendee.create({
      data: {
        eventId: event.id,
        userId,
        status: EventRsvpStatus.GOING,
      },
    });

    return event;
  });
};

export const listEventsService = async (
  page: number,
  limit: number,
  scope: string
) => {
  const skip = (page - 1) * limit;
  const now = new Date();

  const where: any = {};
  if (scope === "upcoming") where.startAt = { gte: now };
  if (scope === "past") where.startAt = { lt: now };

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      skip,
      take: limit,
      include: {
        creator: { select: ATTENDEE_USER_SELECT },
        _count: { select: { attendees: true } },
      },
      orderBy: {
        startAt: scope === "past" ? "desc" : "asc",
      },
    }),
    prisma.event.count({ where }),
  ]);

  return {
    events: events.map(({ _count, ...event }) => ({
      ...event,
      attendeeCount: _count.attendees,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

export const getEventByIdService = async (
  eventId: string,
  userId?: string
) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      creator: { select: ATTENDEE_USER_SELECT },
      _count: { select: { attendees: true } },
    },
  });

  if (!event) {
    throw new AppError("Event not found.", 404);
  }

  let myRsvpStatus: EventRsvpStatus | null = null;

  if (userId) {
    const attendee = await prisma.eventAttendee.findUnique({
      where: {
        eventId_userId: { eventId, userId },
      },
    });
    myRsvpStatus = attendee?.status ?? null;
  }

  const { _count, ...rest } = event;

  return {
    ...rest,
    attendeeCount: _count.attendees,
    myRsvpStatus,
  };
};

export const rsvpToEventService = async (
  eventId: string,
  userId: string,
  status: EventRsvpStatus
) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError("Event not found.", 404);
  }

  return prisma.eventAttendee.upsert({
    where: {
      eventId_userId: { eventId, userId },
    },
    create: { eventId, userId, status },
    update: { status },
  });
};

export const cancelRsvpService = async (
  eventId: string,
  userId: string
) => {
  const existing = await prisma.eventAttendee.findUnique({
    where: {
      eventId_userId: { eventId, userId },
    },
  });

  if (!existing) {
    throw new AppError(
      "You have not RSVP'd to this event.",
      404
    );
  }

  await prisma.eventAttendee.delete({
    where: { id: existing.id },
  });
};

export const getEventAttendeesService = async (
  eventId: string,
  page: number,
  limit: number
) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError("Event not found.", 404);
  }

  const skip = (page - 1) * limit;

  const [attendees, total] = await Promise.all([
    prisma.eventAttendee.findMany({
      where: { eventId },
      skip,
      take: limit,
      include: {
        user: { select: ATTENDEE_USER_SELECT },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.eventAttendee.count({ where: { eventId } }),
  ]);

  return {
    attendees,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};