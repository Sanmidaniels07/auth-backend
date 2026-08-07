-- AlterTable
ALTER TABLE "Message" ALTER COLUMN "content" DROP NOT NULL;

-- CreateTable
CREATE TABLE "MessageMedia" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MessageMedia_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MessageMedia" ADD CONSTRAINT "MessageMedia_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
