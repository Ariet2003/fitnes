/*
  Warnings:

  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `sender_role` to the `feedback` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."feedback" DROP CONSTRAINT "feedback_client_id_fkey";

-- AlterTable
ALTER TABLE "public"."clients" ADD COLUMN     "tariff_id" INTEGER;

-- AlterTable
ALTER TABLE "public"."feedback" ADD COLUMN     "parent_id" INTEGER,
ADD COLUMN     "sender_role" TEXT NOT NULL,
ALTER COLUMN "client_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."tariffs" ALTER COLUMN "end_time" SET DEFAULT '23:00',
ALTER COLUMN "start_time" SET DEFAULT '06:00';

-- DropTable
DROP TABLE "public"."notifications";

-- CreateTable
CREATE TABLE "public"."send_results" (
    "id" SERIAL NOT NULL,
    "news_id" INTEGER NOT NULL,
    "filter_type" TEXT NOT NULL,
    "filter_params" JSONB,
    "total_recipients" INTEGER NOT NULL,
    "success_count" INTEGER NOT NULL,
    "failed_count" INTEGER NOT NULL,
    "pending_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_details" JSONB,
    "sent_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "send_results_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_tariff_id_fkey" FOREIGN KEY ("tariff_id") REFERENCES "public"."tariffs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."send_results" ADD CONSTRAINT "send_results_news_id_fkey" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feedback" ADD CONSTRAINT "feedback_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feedback" ADD CONSTRAINT "feedback_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."feedback"("id") ON DELETE SET NULL ON UPDATE CASCADE;
