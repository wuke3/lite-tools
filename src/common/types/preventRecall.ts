type ChatPeerUid = string;
type ChatName = string;
type RecallChatList = Map<ChatPeerUid, { peerName: ChatName; chatType: number; peerUin: string; msgTime: number }>;
type RecallMsgId = string;
export type { ChatPeerUid, ChatName, RecallChatList, RecallMsgId };
