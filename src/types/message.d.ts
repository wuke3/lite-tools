declare global {

  export interface RecallData {
    operatorNick: string;
    operatorRemark: string;
    operatorMemRemark: string;
    origMsgSenderNick: string;
    origMsgSenderRemark: string;
    origMsgSenderMemRemark: string;
    recallTime: string;
  }

  export interface MsgElementPic {
    picSubType: number;
    fileName: string;
    fileSize: string;
    picWidth: number;
    picHeight: number;
    original: boolean;
    md5HexStr: string;
    sourcePath: string;
    thumbPath?: Map<number, any>;
    transferStatus: number;
    progress: number;
    picType: number;
    invalidState: number;
    fileUuid: string;
    fileSubId: string;
    thumbFileSize: number;
    fileBizId: number | null;
    downloadIndex: number | null;
    summary: string;
    emojiFrom: any;
    emojiWebUrl: any;
    emojiAd: { url: string; desc: string };
    emojiMall: { packageId: number; emojiId: number };
    emojiZplan: {
      actionId: number;
      actionName: string;
      actionType: number;
      playerNumber: number;
      peerUid: string;
      bytesReserveInfo: string;
    };
    originImageMd5: string;
    originImageUrl: string;
    import_rich_media_context: any;
    isFlashPic: any;
    storeID: number;
  }

  export interface TextElement {
    content: string;
    atType: number;
    atUid: string;
    atTinyId: string;
    atNtUid: string;
    subElementType: number;
    atChannelId: string;
    linkInfo: LinkInfo | null;
    atRoleId: string;
    atRoleColor: number;
    atRoleName: string;
    needNotify: number;
  }

  export interface LinkInfo {
    title: string;
    icon: string;
    desc: string;
    richStatus: number;
    tencentDocType: any | null;
  }

  export interface FileElement {
    fileMd5: string;
    fileName: string;
    filePath: string;
    fileSize: string;
    picHeight: number;
    picWidth: number;
    picThumbPath: Map<number, any>;
    expireTime: string;
    file10MMd5: string;
    fileSha: string;
    fileSha3: string;
    videoDuration: number;
    transferStatus: number;
    progress: number;
    invalidState: number;
    fileUuid: string;
    fileSubId: string;
    thumbFileSize: number;
    fileBizId: number;
    thumbMd5: string | null;
    folderId: any;
    fileGroupIndex: number;
    fileTransType: any;
    subElementType: number;
    storeID: number;
  }

  export interface VideoElement {
    filePath: string;
    fileName: string;
    videoMd5: string;
    thumbMd5: string;
    fileTime: number;
    thumbSize: number;
    fileFormat: number;
    fileSize: string;
    thumbWidth: number;
    thumbHeight: number;
    busiType: number;
    subBusiType: number;
    thumbPath: Map<number, any>;
    transferStatus: number;
    progress: number;
    invalidState: number;
    fileUuid: string;
    fileSubId: string;
    fileBizId: number | null;
    originVideoMd5: string;
    import_rich_media_context: any;
    sourceVideoCodecFormat: number;
    storeID: number;
  }

  export interface MarketFaceSupportSize {
    width: number;
    height: number;
  }

  export interface MarketFaceElement {
    itemType: number;
    faceInfo: number;
    emojiPackageId: number;
    subType: number;
    mediaType: number;
    imageWidth: number;
    imageHeight: number;
    faceName: string;
    emojiId: string;
    key: string;
    param: any;
    mobileParam: any;
    sourceType: number;
    startTime: number;
    endTime: number;
    emojiType: number;
    hasIpProduct: number;
    voiceItemHeightArr: any;
    sourceName: string | null;
    sourceJumpUrl: string | null;
    sourceTypeName: string;
    backColor: any;
    volumeColor: any;
    staticFacePath: string;
    dynamicFacePath: string;
    supportSize: MarketFaceSupportSize[];
    apngSupportSize: any;
  }

  export interface ReplyMsgTextElem {
    replyAbsElemType: number;
    textElemContent: string;
    faceElem: any;
    picElem: {
      picHeight: number;
      picText: string;
      picWidth: number;
    };
  }

  export interface ReplyElement {
    replayMsgId: string;
    replayMsgSeq: string;
    replayMsgRootSeq: string;
    replayMsgRootMsgId: string;
    replayMsgRootCommentCnt: string;
    sourceMsgIdInRecords: string;
    sourceMsgText: string;
    sourceMsgTextElems: ReplyMsgTextElem[];
    senderUid: string;
    senderUidStr: string;
    replyMsgClientSeq: string;
    replyMsgTime: string;
    replyMsgRevokeType: number;
    sourceMsgIsIncPic: boolean;
    sourceMsgExpired: boolean;
    anonymousNickName: string | null;
    originalMsgState: any;
  }

  export interface MsgElement {
    elementType: number;
    elementId: string;
    elementGroupId: number;
    extBufForUI: Record<string, any>;
    textElement: TextElement | null;
    faceElement: any;
    marketFaceElement: MarketFaceElement | null;
    replyElement: ReplyElement | null;
    picElement: MsgElementPic | null;
    pttElement: any;
    videoElement: VideoElement | null;
    grayTipElement: any;
    arkElement: any;
    fileElement: FileElement | null;
    liveGiftElement: any;
    markdownElement: any;
    structLongMsgElement: any;
    multiForwardMsgElement: any;
    giphyElement: any;
    walletElement: any;
    inlineKeyboardElement: any;
    textGiftElement: any;
    calendarElement: any;
    yoloGameResultElement: any;
    avRecordElement: any;
    structMsgElement: any;
    faceBubbleElement: any;
    shareLocationElement: any;
    tofuRecordElement: any;
    taskTopMsgElement: any;
    recommendedMsgElement: any;
    actionBarElement: any;
    prologueMsgElement: any;
    forwardMsgElement: any;
  }

  export interface RoleInfo {
    roleId: string;
    name: string;
    color: number;
  }

  export interface Message {
    msgId: string;
    msgRandom: string;
    msgSeq: string;
    cntSeq: string;
    chatType: number;
    msgType: number;
    subMsgType: number;
    sendType: number;
    senderUid: string;
    peerUid: string;
    channelId: string;
    guildId: string;
    guildCode: string;
    fromUid: string;
    fromAppid: string;
    msgTime: string;
    msgMeta: Uint8Array;
    sendStatus: number;
    sendRemarkName: string;
    sendMemberName: string;
    sendNickName: string;
    guildName: string;
    channelName: string;
    elements: MsgElement[];
    records: any[];
    emojiLikesList: any[];
    commentCnt: string;
    directMsgFlag: number;
    directMsgMembers: any[];
    peerName: string;
    freqLimitInfo: any;
    editable: boolean;
    avatarMeta: string;
    avatarPendant: string;
    feedId: string;
    roleId: string;
    timeStamp: string;
    clientIdentityInfo: any;
    isImportMsg: boolean;
    atType: number;
    roleType: number;
    fromChannelRoleInfo: RoleInfo;
    fromGuildRoleInfo: RoleInfo;
    levelRoleInfo: RoleInfo;
    recallTime: string;
    isOnlineMsg: boolean;
    generalFlags: Uint8Array;
    clientSeq: string;
    fileGroupSize: any;
    foldingInfo: any;
    multiTransInfo: any;
    senderUin: string;
    peerUin: string;
    msgAttrs: Map<number, any>;
    anonymousExtInfo: any;
    nameType: number;
    avatarFlag: number;
    extInfoForUI: any;
    personalMedal: any;
    categoryManage: number;
    msgEventInfo: any;
    sourceType: number;
    lt_recall?: RecallData;
  }

  export type MessageList = Message[];
}

export {};
