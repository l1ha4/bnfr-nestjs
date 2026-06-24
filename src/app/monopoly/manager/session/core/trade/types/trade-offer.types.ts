export type MonopolyTradeOfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export type MonopolyTradeOfferStreet = {
  cellTemplateId: string
  name: string
  price: number
}

export type MonopolyTradeOffer = {
  id: string
  sessionId: string
  fromUserId: string
  fromPlayerName: string
  toUserId: string
  toPlayerName: string
  giveMoney: number
  getMoney: number
  giveStreets: MonopolyTradeOfferStreet[]
  getStreets: MonopolyTradeOfferStreet[]
  status: MonopolyTradeOfferStatus
  createdAt: Date
  decidedAt: Date | null
}
