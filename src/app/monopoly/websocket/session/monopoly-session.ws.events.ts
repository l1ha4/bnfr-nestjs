export enum MonopolySessionWsEvent {
  SUBSCRIBE = 'session:subscribe',
  UNSUBSCRIBE = 'session:unsubscribe',

  PLAYER_JOINED = 'session:player-joined',
  PLAYER_READY = 'session:player-ready',
  PLAYER_LEFT = 'session:player-left',
  STATE_UPDATED = 'session:state-updated',
  CHAT_MESSAGE_CREATED = 'session:chat-message-created',
}
