import { Injectable } from '@nestjs/common'
import { MonopolyMoveType } from '@prisma/client'
import { PrismaService } from '@/core/prisma/prisma.service'
import { MonopolyWebsocketGateway } from '../../../../../../websocket/monopoly-websocket.gateway'
import { AuctionSessionMonopolyManager } from '../../../auction/auction-session.monopoly.manager'

type TypeAuctionSessionSnapshot = {
  id: string
  currentMovePlayerId: string | null
  currentTypeMove: MonopolyMoveType
  template: {
    cells: Array<{
      id: string
      name: string
      orderIndex: number
      type: string | null
      price: number | null
    }>
  }
}

type TypeAuctionSessionParams<TSession extends TypeAuctionSessionSnapshot> = {
  sessionId: string
  session: TSession
  prisma: PrismaService
  monopolyGateway: MonopolyWebsocketGateway
  fetchSessionSnapshot: (id: string) => Promise<TSession>
  auctionSessionMonopolyManager: AuctionSessionMonopolyManager
}

@Injectable()
export class TypeAuctionSessionMonopolyManager {
  public async refusePurchase<TSession extends TypeAuctionSessionSnapshot>({
    sessionId,
    session,
    prisma,
    monopolyGateway,
    fetchSessionSnapshot,
    auctionSessionMonopolyManager,
  }: TypeAuctionSessionParams<TSession>) {
    return auctionSessionMonopolyManager.refusePurchase({
      sessionId,
      session,
      prisma,
      monopolyGateway,
      fetchSessionSnapshot,
    })
  }
}
