declare global {
  interface Peer {
    chatType: 1 | 2 | 100;
    guildId: string;
    peerUid: string;
  }
}

export {};
