-- CreateTable
CREATE TABLE "monopoly_street_economy_templates" (
    "id" TEXT NOT NULL,
    "cell_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "purchase_prices_by_owned_count" JSONB NOT NULL,
    "rent_by_owned_count" JSONB NOT NULL,
    "base_rent_without_upgrades" INTEGER,
    "upgrades" JSONB NOT NULL,
    "sale_price_without_upgrades" INTEGER,
    "sale_price_by_upgrade_count" JSONB NOT NULL,
    "mortgage_price" INTEGER,
    "mortgage_buyout_price" INTEGER,
    "allow_rent_when_mortgaged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monopoly_street_economy_templates_pkey" PRIMARY KEY ("id")
);

-- Backfill existing JSON data into the new relation table.
INSERT INTO "monopoly_street_economy_templates" (
    "id",
    "cell_id",
    "description",
    "purchase_prices_by_owned_count",
    "rent_by_owned_count",
    "base_rent_without_upgrades",
    "upgrades",
    "sale_price_without_upgrades",
    "sale_price_by_upgrade_count",
    "mortgage_price",
    "mortgage_buyout_price",
    "allow_rent_when_mortgaged",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "id",
    "street_economy" ->> 'description',
    "street_economy" -> 'purchasePricesByOwnedCount',
    "street_economy" -> 'rentByOwnedCount',
    ("street_economy" ->> 'baseRentWithoutUpgrades')::INTEGER,
    "street_economy" -> 'upgrades',
    ("street_economy" ->> 'salePriceWithoutUpgrades')::INTEGER,
    "street_economy" -> 'salePriceByUpgradeCount',
    ("street_economy" ->> 'mortgagePrice')::INTEGER,
    ("street_economy" ->> 'mortgageBuyoutPrice')::INTEGER,
    COALESCE(("street_economy" ->> 'allowRentWhenMortgaged')::BOOLEAN, false),
    "createdAt",
    "updatedAt"
FROM "monopoly_cell_templates"
WHERE "street_economy" IS NOT NULL;

-- AlterTable
ALTER TABLE "monopoly_cell_templates"
DROP COLUMN "street_economy";

-- AddForeignKey
ALTER TABLE "monopoly_street_economy_templates"
ADD CONSTRAINT "monopoly_street_economy_templates_cell_id_fkey"
FOREIGN KEY ("cell_id") REFERENCES "monopoly_cell_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "monopoly_street_economy_templates_cell_id_key" ON "monopoly_street_economy_templates"("cell_id");