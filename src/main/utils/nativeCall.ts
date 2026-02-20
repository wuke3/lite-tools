import { dispatchIpcEvent } from "@/main/utils/dispatchIpcEvent";

function getUserInfo(uid: string[], webContentId: number = 2) {
  return dispatchIpcEvent(
    webContentId,
    {
      type: "request",
      eventName: "ntApi",
    },
    {
      cmdName: "nodeIKernelProfileService/fetchUserDetailInfo",
      cmdType: "invoke",
      payload: [
        {
          callFrom: "BuddyProfileStore",
          uid,
          bizList: [0],
          source: 0,
        },
        null,
      ],
    },
    true
  );
}

export { getUserInfo };
