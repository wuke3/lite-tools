import { contextBridge, ipcRenderer } from "electron";
import type { RecallChatList } from "@/common/types/preventRecall";

const exposeFunctions = {
  getAllRecallChatList: (): Promise<RecallChatList> => ipcRenderer.invoke("lite_tools.getAllRecallChatList"),
  getRecallMessagesByUid: (uid: string): Promise<Message[]> =>
    ipcRenderer.invoke("lite_tools.getRecallMessagesByUid", uid),
  sendBroadcast: (channelName: any, payload: any) => ipcRenderer.send("lite_tools.broadcast", channelName, payload),
};

contextBridge.exposeInMainWorld("lt_showRecallList", exposeFunctions);

export type Lt_showRecallList = typeof exposeFunctions;
