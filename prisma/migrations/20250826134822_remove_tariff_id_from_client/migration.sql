/*
  Warnings:

  - You are about to drop the column `tariff_id` on the `clients` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."clients" DROP CONSTRAINT "clients_tariff_id_fkey";

-- AlterTable
ALTER TABLE "public"."clients" DROP COLUMN "tariff_id";
