-- AlterTable
ALTER TABLE "public"."subscriptions" ADD COLUMN     "trainer_id" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
