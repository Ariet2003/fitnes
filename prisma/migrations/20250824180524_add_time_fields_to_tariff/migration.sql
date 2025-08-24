-- AlterTable
ALTER TABLE "public"."tariffs" ADD COLUMN     "end_time" TEXT NOT NULL DEFAULT '13:00',
ADD COLUMN     "start_time" TEXT NOT NULL DEFAULT '08:00';
