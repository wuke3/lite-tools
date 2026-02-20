/**
 * 已知消息类型
 * 1:textElement文本消息
 * 2:picElement图片消息
 * 3:fileElement文件消息
 * 4:pttElement语音消息
 * 5:videoElement视频消息
 * 6:faceElement表情消息
 * 7:replyElement回复消息
 * 8:grayTipElement消息
 *
 * 10:arkElement模板消息
 * 11:marketFaceElement商城表情消息
 *
 * 16:multiForwardMsgElement合并转发消息
 * **/

export enum ElementType {
  textElement = 1,
  picElement = 2,
  fileElement = 3,
  pttElement = 4,
  videoElement = 5,
  faceElement = 6,
  replyElement = 7,
  grayTipElement = 8,
  arkElement = 10,
  marketFaceElement = 11,
  multiForwardMsgElement = 16,
}
