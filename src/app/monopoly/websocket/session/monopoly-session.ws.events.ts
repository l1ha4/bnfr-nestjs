export enum MonopolySessionWsEvent {
  SUBSCRIBE = 'session:subscribe',
  UNSUBSCRIBE = 'session:unsubscribe',

  PLAYER_JOINED = 'session:player-joined',
  PLAYER_READY = 'session:player-ready',
  PLAYER_LEFT = 'session:player-left',
  STATE_UPDATED = 'session:state-updated',
  CHAT_MESSAGE_CREATED = 'session:chat-message-created',
  TRADE_OFFER_CREATED = 'session:trade-offer-created',
  TRADE_OFFER_UPDATED = 'session:trade-offer-updated',
}
