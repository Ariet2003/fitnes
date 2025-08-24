/*
  Warnings:

  - You are about to drop the column `status` on the `clients` table. All the data in the column will be lost.

*/
-- AlterTable
-- Удаляем колонку status из таблицы clients
-- Данные в колонке будут потеряны, но это ожидаемое поведение согласно требованиям
ALTER TABLE "clients" DROP COLUMN "status";
