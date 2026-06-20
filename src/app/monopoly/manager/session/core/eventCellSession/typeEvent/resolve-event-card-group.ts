import { BadRequestException } from '@nestjs/common'
import { MonopolyCellType } from '@prisma/client'

type EventCardAction = {
  id: string
  actionType: string
  amount: number | null
  targetCellId: string | null
  text: string | null
}

type EventCard = {
  id: string
  title: string
  description: string | null
  actions: EventCardAction[]
}

type EventCardGroup = {
  id: string
  title: string
  cards: EventCard[]
}

type EventCell = {
  name: string
  type: MonopolyCellType | null
}

const normalizeValue = (value: string | null | undefined) =>
  (value ?? '').trim().toLowerCase()

const chanceTokens = ['chance', 'шанс']
const communityTokens = ['community', 'chest', 'казна', 'общественная']

const hasAnyToken = (value: string, tokens: string[]) =>
  tokens.some((token) => value.includes(token))

export const resolveEventCardGroup = ({
  landedCell,
  cardGroups,
}: {
  landedCell: EventCell
  cardGroups: EventCardGroup[]
}) => {
  if (!cardGroups.length) {
    throw new BadRequestException('Для шаблона не настроены группы карточек событий')
  }

  const normalizedCellName = normalizeValue(landedCell.name)

  const matchedGroups = cardGroups.filter((group) => {
    const normalizedTitle = normalizeValue(group.title)

    if (landedCell.type === MonopolyCellType.CHANCE) {
      return hasAnyToken(normalizedTitle, chanceTokens)
    }

    if (
      landedCell.type === MonopolyCellType.COMMUNITY ||
      landedCell.type === MonopolyCellType.COMMUNITY_CHEST
    ) {
      return hasAnyToken(normalizedTitle, communityTokens)
    }

    return normalizedTitle === normalizedCellName
  })

  if (matchedGroups.length === 1) {
    return matchedGroups[0]
  }

  if (matchedGroups.length > 1) {
    const exactByName = matchedGroups.find(
      (group) => normalizeValue(group.title) === normalizedCellName,
    )

    return exactByName ?? matchedGroups[0]
  }

  if (cardGroups.length === 1) {
    return cardGroups[0]
  }

  throw new BadRequestException(
    `Не удалось определить группу карточек для клетки ${landedCell.name}`,
  )
}

export const pickRandomEventCard = (group: EventCardGroup) => {
  if (!group.cards.length) {
    throw new BadRequestException(
      `В группе карточек ${group.title} нет доступных событий`,
    )
  }

  const randomIndex = Math.floor(Math.random() * group.cards.length)

  return group.cards[randomIndex]
}
