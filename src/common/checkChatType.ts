function checkChatType(peer: Peer) {
  if (!peer) {
    return false;
  }
  // 1 私聊, 2 群聊, 100 临时会话
  return [1, 2, 100].includes(peer?.chatType);
}

export { checkChatType };
