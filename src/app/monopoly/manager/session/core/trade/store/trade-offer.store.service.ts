import { Injectable } from '@nestjs/common'
import type {
  MonopolyTradeOffer,
  MonopolyTradeOfferStatus,
} from '../types/trade-offer.types'

@Injectable()
export class TradeOfferStoreService {
  private readonly offersById = new Map<string, MonopolyTradeOffer>()

  public create(offer: MonopolyTradeOffer): MonopolyTradeOffer {
    this.offersById.set(offer.id, offer)
    return offer
  }

  public getById(offerId: string): MonopolyTradeOffer | null {
    return this.offersById.get(offerId) ?? null
  }

  public getIncomingPending(
    sessionId: string,
    toUserId: string,
  ): MonopolyTradeOffer[] {
    return Array.from(this.offersById.values())
      .filter(
        (offer) =>
          offer.sessionId === sessionId &&
          offer.toUserId === toUserId &&
          offer.status === 'PENDING',
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  public updateStatus(
    offerId: string,
    status: MonopolyTradeOfferStatus,
  ): MonopolyTradeOffer | null {
    const currentOffer = this.offersById.get(offerId)

    if (!currentOffer) {
      return null
    }

    const updatedOffer: MonopolyTradeOffer = {
      ...currentOffer,
      status,
      decidedAt: new Date(),
    }

    this.offersById.set(offerId, updatedOffer)

    return updatedOffer
  }

  public clearSession(sessionId: string): void {
    for (const [offerId, offer] of this.offersById.entries()) {
      if (offer.sessionId === sessionId) {
        this.offersById.delete(offerId)
      }
    }
  }
}
