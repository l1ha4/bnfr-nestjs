export enum MonopolySessionWsEvent {
  SUBSCRIBE = 'session:subscribe',
  UNSUBSCRIBE = 'session:unsubscribe',

  PLAYER_JOINED = 'session:player-joined',
  PLAYER_LEFT = 'session:player-left',
  STATE_UPDATED = 'session:state-updated',
}