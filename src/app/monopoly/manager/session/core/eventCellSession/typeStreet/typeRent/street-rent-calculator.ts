import { MonopolyStreetRentGrowthMode, Prisma } from '@prisma/client'

type StreetRentCollection = {
  rentGrowthMode: MonopolyStreetRentGrowthMode
  streetsCount: number | null
}

type StreetRentEconomy = {
  baseRentWithoutUpgrades: number | null
  rentByOwnedCount: Prisma.JsonValue
  upgrades: Prisma.JsonValue
  allowRentWhenMortgaged: boolean
}

type StreetRentCell = {
  id: string
  collectionId?: string | null
  collection?: StreetRentCollection | null
  streetEconomy?: StreetRentEconomy | null
}

type StreetRentProperty = {
  cellTemplateId: string
  ownerUserId: string | null
  level: number
  isMortgaged: boolean
}

type StreetRentSession = {
  template?: {
    cells: Array<StreetRentCell & { id: string }>
  }
  property?: StreetRentProperty[]
  properties?: StreetRentProperty[]
}

const getSessionProperties = (session: StreetRentSession) =>
  session.properties ?? session.property ?? []

const getCollectionCells = (session: StreetRentSession, collectionId: string) =>
  session.template?.cells.filter(
    (cell) => cell.collectionId === collectionId,
  ) ?? []

const isNumberArray = (
  value: Prisma.JsonValue,
): value is Array<number | null> =>
  Array.isArray(value) &&
  value.every((item) => item === null || typeof item === 'number')

const isUpgradeArray = (
  value: Prisma.JsonValue,
): value is Array<{ rentAfterUpgrade: number | null }> =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      item !== null && typeof item === 'object' && 'rentAfterUpgrade' in item,
  )

const getOwnedCollectionCells = (
  session: StreetRentSession,
  collectionId: string,
  ownerUserId: string,
) => {
  const ownedCellIds = new Set(
    getSessionProperties(session)
      .filter((property) => property.ownerUserId === ownerUserId)
      .map((property) => property.cellTemplateId),
  )

  return getCollectionCells(session, collectionId).filter((cell) =>
    ownedCellIds.has(cell.id),
  )
}

const getLandedProperty = (session: StreetRentSession, landedCellId: string) =>
  getSessionProperties(session).find(
    (property) => property.cellTemplateId === landedCellId,
  ) ?? null

const getRentByOwnedCount = (
  rentByOwnedCount: Prisma.JsonValue,
  ownedCount: number,
) => {
  if (
    !isNumberArray(rentByOwnedCount) ||
    ownedCount <= 0 ||
    rentByOwnedCount.length === 0
  ) {
    return null
  }

  return (
    rentByOwnedCount[Math.min(ownedCount - 1, rentByOwnedCount.length - 1)] ??
    null
  )
}

const getRentByUpgradeLevel = (
  economy: StreetRentEconomy,
  upgradeLevel: number,
) => {
  if (upgradeLevel <= 0) {
    return economy.baseRentWithoutUpgrades
  }

  if (!isUpgradeArray(economy.upgrades) || economy.upgrades.length === 0) {
    return economy.baseRentWithoutUpgrades
  }

  return (
    economy.upgrades[Math.min(upgradeLevel - 1, economy.upgrades.length - 1)]
      ?.rentAfterUpgrade ?? economy.baseRentWithoutUpgrades
  )
}

export const resolveStreetRentAmount = ({
  session,
  landedCell,
  ownerUserId,
}: {
  session: any
  landedCell: StreetRentCell
  ownerUserId: string
}) => {
  const economy = landedCell.streetEconomy
  const landedProperty = getLandedProperty(session, landedCell.id)

  if (!economy) {
    return 0
  }

  if (landedProperty?.isMortgaged && !economy.allowRentWhenMortgaged) {
    return 0
  }

  const collectionId = landedCell.collectionId

  if (!collectionId) {
    return economy.baseRentWithoutUpgrades ?? 0
  }

  const collectionCells = getCollectionCells(session, collectionId)
  const ownedCollectionCells = getOwnedCollectionCells(
    session,
    collectionId,
    ownerUserId,
  )

  if (collectionCells.length === 0) {
    return economy.baseRentWithoutUpgrades ?? 0
  }

  if (
    landedCell.collection?.rentGrowthMode ===
    MonopolyStreetRentGrowthMode.BY_UPGRADES
  ) {
    const requiredStreetCount =
      landedCell.collection.streetsCount ?? collectionCells.length

    if (ownedCollectionCells.length < requiredStreetCount) {
      return economy.baseRentWithoutUpgrades ?? 0
    }

    return getRentByUpgradeLevel(economy, landedProperty?.level ?? 0) ?? 0
  }

  return (
    getRentByOwnedCount(
      economy.rentByOwnedCount,
      ownedCollectionCells.length,
    ) ??
    economy.baseRentWithoutUpgrades ??
    0
  )
}
