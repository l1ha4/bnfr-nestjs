import { BadRequestException, Body, Controller, Param, Post, Req } from '@nestjs/common'
import { UserRole } from '@prisma/client'
import { MonopolyService } from '../../monopoly.service'
import { Authorization } from '../../../../auth/decorators/auth.decorators'
import { MONOPOLY_API_PREFIX } from '../../config/monopolyApi.config'
import type { Request } from 'express'

@Controller(MONOPOLY_API_PREFIX)
export class GameActionsController {
  constructor(private readonly monopolyService: MonopolyService) {}

  @Authorization()
  @Post('session/:sessionId/roll-turn')
  rollTurn(@Param('sessionId') sessionId: string, @Req() req: Request) {
    return this.monopolyService.rollTurn(sessionId, req)
  }

  @Authorization()
  @Post('session/:sessionId/buy-street/:cellId')
  buyStreet(
    @Param('sessionId') sessionId: string,
    @Param('cellId') cellId: string,
    @Req() req: Request,
  ) {
    return this.monopolyService.buyStreet(sessionId, cellId, req)
  }

  @Authorization()
  @Post('session/:sessionId/refuse-purchase')
  refusePurchase(@Param('sessionId') sessionId: string, @Req() req: Request) {
    return this.monopolyService.refusePurchase(sessionId, req)
  }

  @Authorization()
  @Post('session/:sessionId/pay-rent')
  payRent(@Param('sessionId') sessionId: string, @Req() req: Request) {
    return this.monopolyService.payRent(sessionId, req)
  }

  @Authorization()
  @Post('session/:sessionId/auction/:auctionId/bid')
  raiseAuctionBid(
    @Param('sessionId') sessionId: string,
    @Param('auctionId') auctionId: string,
    @Body('price') rawPrice: number,
    @Req() req: Request,
  ) {
    const price = Number(rawPrice)

    if (!Number.isInteger(price) || price <= 0) {
      throw new BadRequestException('Некорректная ставка')
    }

    return this.monopolyService.raiseAuctionBid(
      sessionId,
      auctionId,
      price,
      req,
    )
  }

  @Authorization()
  @Post('session/:sessionId/auction/:auctionId/decline')
  declineAuction(
    @Param('sessionId') sessionId: string,
    @Param('auctionId') auctionId: string,
    @Req() req: Request,
  ) {
    return this.monopolyService.declineAuction(sessionId, auctionId, req)
  }

  @Authorization(UserRole.ADMIN)
  @Post('session/:sessionId/reset')
  resetSession(@Param('sessionId') sessionId: string, @Req() req: Request) {
    return this.monopolyService.resetSession(sessionId, req)
  }
}
