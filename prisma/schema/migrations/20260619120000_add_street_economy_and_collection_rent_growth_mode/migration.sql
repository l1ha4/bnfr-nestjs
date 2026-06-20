-- CreateEnum
CREATE TYPE "MonopolyStreetRentGrowthMode" AS ENUM (
  'BY_COLLECTION_SIZE',
  'BY_UPGRADES'
);

-- AlterTable
ALTER TABLE "monopoly_cell_templates"
ADD COLUMN "color_owner" TEXT,
ADD COLUMN "show_purchase_preview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "street_economy" JSONB;

-- AlterTable
ALTER TABLE "monopoly_street_collection_templates"
ADD COLUMN "rent_growth_mode" "MonopolyStreetRentGrowthMode" NOT NULL DEFAULT 'BY_COLLECTION_SIZE',
ADD COLUMN "streets_count" INTEGER,
ADD COLUMN "upgrades_enabled" BOOLEAN,
ADD COLUMN "max_upgrade_level" INTEGER;
