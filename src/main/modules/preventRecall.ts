import { ipcMain, dialog, BrowserWindow, shell } from "electron";
import { serialize, deserialize } from "node:v8";
import { deflateSync, inflateSync } from "node:zlib";
import path from "node:path";
import fs from "node:fs";
import { dataPath, pluginPath } from "@/main/utils/pluginPaths";
import { settingWindow } from "@/main/utils/captureWindow";
import { createLogger } from "@/main/utils/createLogger";
import { configManager } from "@/main/modules/configManager";
import { globalBroadcast } from "@/main/utils/globalBroadcast";
import { getUserInfo } from "@/main/utils/nativeCall";
import { getImageUrl } from "@/main/utils/getImageUrl";

import type { RecallChatList, RecallMsgId } from "@/common/types/preventRecall";

const log = createLogger("preventRecall", true);

type MsgId = string;
type Uid = string;
type PicElement = any;
type RecallCache = Map<MsgId, Message>;
type AllRecallCache = Map<Uid, Message[]>;
type FilePath = string;
type PersistedFiles = { time: number; path: FilePath; info: { version: number; msgCount: number } }[];
type RecallElement = {
  isSelfOperate: boolean;
  operatorNick: string;
  operatorRemark: string;
  operatorMemRemark: string;
  origMsgSenderNick: string;
  origMsgSenderRemark: string;
  origMsgSenderMemRemark: string;
};

type ChatList = {
  name: string;
  chatType: number;
  uid: string;
};

enum ElementType {
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

class MsgStore {
  // 最近消息 <msgId, msg>
  private recentMessages: RecallCache = new Map();
  // 实时阻止撤回的消息 <msgId, msg>
  private activeRecallCache: RecallCache = new Map();
  // 持久化保存的文件列表
  private persistedFiles: PersistedFiles = [];
  // 缓存的已加载持久化撤回数据
  private loadedPersistedCache: Map<FilePath, RecallCache> = new Map();
  // 撤回消息查看窗口
  private recallMsgListWindow: BrowserWindow | null = null;
  // 所有撤回消息缓存，仅用于打开查看撤回消息列表页面时使用
  private allCaches: AllRecallCache = new Map();
  private readonly RECALL_CACHE_VERSION = 1;
  private readonly RECALL_CACHE_MAGIC = Buffer.from("LTRECALL");
  // 缓存持久化文件的数量
  private MAX_PERSISTED_FILES!: number;
  // 每个切片文件储存消息数量
  private MAX_MESSAGES_PER_FILE!: number;
  // 实时缓存的消息数量
  private MAX_RECALL_CACHE_SIZE!: number;
  // 本地持久化文件路径
  private LOCAL_DATA_PATH!: string;
  // 重定向图片路径
  private LOCAL_REDIRECT_PIC_PATH!: string;
  // 下载中的图片地址
  private downloadingPics = new Set<string>();
  // 实例是否就绪
  private isReady = false;

  constructor() {
    this.setup();
  }

  private async setup() {
    log("initing...");
    await configManager.ready;

    this.MAX_PERSISTED_FILES = configManager.value.message.preventRecall.MAX_PERSISTED_FILES;
    this.MAX_MESSAGES_PER_FILE = configManager.value.message.preventRecall.MAX_MESSAGES_PER_FILE;
    this.MAX_RECALL_CACHE_SIZE = configManager.value.message.preventRecall.MAX_RECALL_CACHE_SIZE;

    this.initLocalDataPath();
    this.initIpcEvent();
    this.loadActiveRecallCacheBuffer();
    this.loadPersistedFiles();
    this.isReady = true;

    log("init done");
  }

  private initLocalDataPath() {
    const base = path.join(dataPath, "messageRecall", configManager.uid);
    const redirectDir = path.join(base, "redirectPic");
    const cacheFile = path.join(base, "activeRecallCache.bin");

    this.LOCAL_DATA_PATH = base;
    this.LOCAL_REDIRECT_PIC_PATH = redirectDir;

    if (!fs.existsSync(redirectDir)) {
      fs.mkdirSync(redirectDir, { recursive: true });
    }

    if (!fs.existsSync(cacheFile)) {
      fs.writeFileSync(cacheFile, Buffer.alloc(0));
    }
  }

  private initIpcEvent() {
    ipcMain.handle("lite_tools.getAllRecallChatList", async (event) => {
      return this.getAllRecallChatList();
    });
    ipcMain.handle("lite_tools.getRecallMessagesByUid", (event, peerUid) => {
      return this.getRecallMessagesByUid(peerUid);
    });
    ipcMain.handle("lite_tools.getRecallCacheSize", (event) => {
      return this.recallCacheSize;
    });
    ipcMain.on("lite_tools.clearRecallCache", (event) => {
      this.clearPersistedFiles();
    });
    ipcMain.on("lite_tools.openRecallMsgList", (event) => {
      this.openRecallMsgList();
    });
    ipcMain.on("lite_tools.openRedirectPicPath", (event) => {
      shell.openPath(this.LOCAL_REDIRECT_PIC_PATH);
    });
  }

  private async getAllRecallChatList() {
    const chatList: RecallChatList = new Map();
    const allMessages: Message[] = [];
    this.allCaches.clear();

    for (const persistedFile of this.persistedFiles) {
      const persistedCache = this.loadPersistedFile(persistedFile.path);
      if (persistedCache) {
        allMessages.push(...persistedCache.values());
      }
    }
    allMessages.push(...this.activeRecallCache.values());

    // 先找出所有需要请求用户信息的 uid
    const unknownUids = new Set<string>();
    for (const msg of allMessages) {
      if (msg.chatType !== 2) {
        unknownUids.add(msg.peerUid);
      }
    }
    let userInfos = new Map<string, any>();
    if (unknownUids.size > 0) {
      try {
        const res = await getUserInfo([...unknownUids]);
        log("getUserInfo", res);
        userInfos = res.detail;
      } catch {}
    }

    for (const message of allMessages) {
      const uid = message.peerUid;
      let cache = this.allCaches.get(uid);
      if (!cache) {
        cache = [];
        this.allCaches.set(uid, cache);
      }
      cache.push(message);

      if (!chatList.has(uid)) {
        if (message.chatType === 2 && !message.peerName) {
          continue;
        }
        const info = message.chatType === 2 ? null : userInfos.get(uid);
        let peerName;
        if (message.chatType === 2) {
          peerName = message.peerName;
        } else {
          const coreInfo = info?.simpleInfo?.coreInfo;
          peerName = coreInfo?.remark || coreInfo?.nick || "未知用户";
        }
        chatList.set(uid, {
          peerName,
          chatType: message.chatType,
          peerUin: message.peerUin,
          msgTime: parseInt(message.msgTime),
        });
      } else {
        chatList.get(uid)!.msgTime = parseInt(message.msgTime);
      }
    }
    log("返回获取所有聊天列表数量", chatList.size);

    // 根据消息时间排序
    const sortedChatList = new Map([...chatList].sort((a, b) => b[1].msgTime - a[1].msgTime));

    return sortedChatList;
  }

  private getRecallMessagesByUid(peerUid: string) {
    log("getRecallMessagesByUid", peerUid, this.allCaches.get(peerUid));
    return this.allCaches.get(peerUid);
  }

  private openRecallMsgList() {
    if (this.recallMsgListWindow && this.recallMsgListWindow.isDestroyed() === false) {
      this.recallMsgListWindow.webContents.focus();
    } else {
      this.recallMsgListWindow = new BrowserWindow({
        width: 800,
        height: 600,
        autoHideMenuBar: true,
        webPreferences: {
          preload: path.join(pluginPath, `/dist/preload/recallMsgViewer.js`),
        },
      });
      this.recallMsgListWindow.setMenuBarVisibility(false);
      const htmlPath = path.join(pluginPath, `/dist/renderer/pages/recallMsgViewer/index.html`);
      this.recallMsgListWindow.loadFile(htmlPath);
      this.recallMsgListWindow.webContents.on("before-input-event", (_, input) => {
        if (input.key == "F5" && input.type == "keyUp") {
          this.recallMsgListWindow!.loadFile(htmlPath);
        }
      });
      this.recallMsgListWindow.on("closed", () => {
        this.recallMsgListWindow = null;
        this.allCaches.clear();
      });
    }
  }

  private loadActiveRecallCacheBuffer() {
    const file = path.join(this.LOCAL_DATA_PATH, "activeRecallCache.bin");
    const data = fs.readFileSync(file);
    const total = data.length;
    let offset = 0;

    while (offset + 4 <= total) {
      try {
        const len = data.readUInt32BE(offset);
        offset += 4;
        if (offset + len > total) {
          log("数据长度异常，终止读取");
          break;
        }
        const msgBuf = data.subarray(offset, offset + len);
        offset += len;
        const message = deserialize(inflateSync(msgBuf));
        this.activeRecallCache.set(message.msgId, message);
      } catch (e) {
        log(`读取缓存数据出错 offset=${offset}`, e);
        break;
      }
    }

    log(`成功读取 ${this.activeRecallCache.size} 条缓存数据`);
  }

  private loadPersistedFiles() {
    const filterRegex = /^\d+\.bin$/;
    this.persistedFiles = fs
      .readdirSync(this.LOCAL_DATA_PATH, { withFileTypes: true })
      .filter((file) => filterRegex.test(file.name))
      .map((file) => {
        const filePath = path.join(this.LOCAL_DATA_PATH, file.name);
        return {
          time: parseInt(file.name.split(".")[0], 10),
          path: filePath,
          info: this.readRecallCacheFileHeader(filePath),
        };
      })
      .sort((a, b) => a.time - b.time);
    log(`读取到 ${this.persistedFiles.length} 个持久化文件`);
  }

  private saveToTempFile(message: Message) {
    try {
      const buf = deflateSync(serialize(message));
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32BE(buf.length);
      fs.appendFileSync(path.join(this.LOCAL_DATA_PATH, "activeRecallCache.bin"), Buffer.concat([lenBuf, buf]));
      log("写入临时数据", message.msgId);
    } catch (e) {
      log("写入临时数据出错", e);
    }
  }

  private readRecallCacheFileHeader(filePath: string) {
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);
    const magic = buf.subarray(0, 8);
    if (!magic.equals(this.RECALL_CACHE_MAGIC)) {
      return {
        version: -1,
        msgCount: 0,
      };
    }
    const version = buf.readUInt32LE(8);
    const msgCount = buf.readUInt32LE(12);
    return {
      version,
      msgCount,
    };
  }

  private saveToPersistedFile(date: number) {
    const messageCount = this.activeRecallCache.size;
    const compressed = deflateSync(serialize(this.activeRecallCache));

    const header = Buffer.alloc(8 + 4 + 4);
    this.RECALL_CACHE_MAGIC.copy(header, 0);
    header.writeUInt32LE(this.RECALL_CACHE_VERSION, 8);
    header.writeUInt32LE(messageCount, 12);

    const finalBuffer = Buffer.concat([header, compressed]);

    const filePath = path.join(this.LOCAL_DATA_PATH, `${date}.bin`);

    fs.writeFileSync(filePath, finalBuffer);

    this.persistedFiles.push({
      time: date,
      path: filePath,
      info: { version: this.RECALL_CACHE_VERSION, msgCount: messageCount },
    });

    log("写入持久化文件", `${date}.bin`);
  }

  private getMessageFromPersisted(msgId: MsgId, recallTime: number) {
    const filePath = this.findPersistedFile(recallTime);
    if (!filePath) return null;

    const persistedCache = this.loadPersistedFile(filePath);
    if (!persistedCache) return null;

    const msg = persistedCache.get(msgId);
    if (msg) {
      log("从持久化文件中找到消息", msgId);
      return msg;
    }

    log("消息不在持久化文件中", msgId);
    return null;
  }

  private findPersistedFile(recallTime: number): string | null {
    const find = this.persistedFiles.find((item) => item.time >= recallTime);
    if (!find) {
      log("没有创建持久化文件");
      return null;
    }
    const filePath = find.path;
    log("找到持久化文件候选路径", filePath);
    return filePath;
  }

  private loadPersistedFile(filePath: string): RecallCache | null {
    if (this.loadedPersistedCache.has(filePath)) {
      log("持久化文件已缓存到内存", filePath);
      return this.loadedPersistedCache.get(filePath)!;
    }

    if (!fs.existsSync(filePath)) {
      log("磁盘上不存在持久化文件", filePath);
      return null;
    }

    try {
      const data = fs.readFileSync(filePath);

      // 读取头部
      const magic = data.subarray(0, 8);
      if (!magic.equals(this.RECALL_CACHE_MAGIC)) {
        throw new Error(`文件魔数错误: ${magic}`);
      }

      const version = data.readUInt32LE(8);
      const messageCount = data.readUInt32LE(12);
      log(`加载持久化文件 版本:${version} 消息数:${messageCount}`);

      // 解压剩余部分
      const compressed = data.subarray(16);
      const persistedCache = deserialize(inflateSync(compressed)) as RecallCache;

      // 缓存到内存
      this.loadedPersistedCache.set(filePath, persistedCache);
      if (this.loadedPersistedCache.size > this.MAX_PERSISTED_FILES) {
        const oldest = this.loadedPersistedCache.keys().next().value!;
        this.loadedPersistedCache.delete(oldest);
        log(`缓存文件超出上限 ${this.MAX_PERSISTED_FILES}，卸载`, oldest);
      }

      return persistedCache;
    } catch (e) {
      log("加载持久化文件失败", filePath, e);
      return null;
    }
  }

  private loadFromPersistedFile(msgId: MsgId, recallTime: number) {
    const find = this.persistedFiles.find((item) => item.time >= recallTime);
    if (!find) {
      log("没有创建持久化文件");
      return null;
    }

    const filePath = find.path;

    if (this.loadedPersistedCache.has(filePath)) {
      log("持久化文件已缓存到内存", filePath);
      const persistedCache = this.loadedPersistedCache.get(filePath)!;
      const msg = persistedCache.get(msgId);
      if (msg) {
        log("从已加载的持久化文件中找到消息", msgId);
        return msg;
      }
      log("已加载的持久化文件中未找到消息", msgId);
      return null;
    }

    // 文件未缓存，需要检查磁盘
    if (!fs.existsSync(filePath)) {
      log("磁盘上不存在持久化文件", filePath);
      return null;
    }

    log("磁盘上找到持久化文件，准备加载", filePath);

    try {
      const data = fs.readFileSync(filePath);

      // 读取头部
      const magic = data.subarray(0, 8);
      if (!magic.equals(this.RECALL_CACHE_MAGIC)) {
        throw new Error(`文件魔数错误: ${magic}`);
      }
      const version = data.readUInt32LE(8);
      const messageCount = data.readUInt32LE(12);
      log(`加载持久化文件 版本:${version} 消息数:${messageCount}`);

      // 解压剩余部分
      const compressed = data.subarray(16);
      const persistedCache = deserialize(inflateSync(compressed)) as RecallCache;

      this.loadedPersistedCache.set(filePath, persistedCache);
      if (this.loadedPersistedCache.size > this.MAX_PERSISTED_FILES) {
        const oldest = this.loadedPersistedCache.keys().next().value!;
        this.loadedPersistedCache.delete(oldest);
        log(`缓存文件超出上限 ${this.MAX_PERSISTED_FILES}，卸载`, oldest);
      }

      const msg = persistedCache.get(msgId);
      if (msg) {
        log("从持久化文件中找到数据", msgId);
        return msg;
      }
      log("消息不在持久化文件中");
      return null;
    } catch (e) {
      log("加载持久化文件失败", filePath, e);
      return null;
    }
  }

  private async clearPersistedFiles() {
    if (settingWindow && settingWindow?.isDestroyed() === false) {
      const { response } = await dialog.showMessageBox(settingWindow, {
        type: "question",
        title: "确认",
        message: "确定要清除所有撤回数据吗？",
        buttons: ["取消", "确定"],
      });

      if (response === 1) {
        for (const file of this.persistedFiles) {
          fs.unlinkSync(file.path);
        }
        this.persistedFiles = [];
        this.loadedPersistedCache.clear();
        this.activeRecallCache.clear();
        fs.writeFileSync(path.join(this.LOCAL_DATA_PATH, "activeRecallCache.bin"), Buffer.alloc(0));
        settingWindow.webContents.send("lite_tools.updateRecallCacheSize", 0);
      }
    }
  }

  private processMsgImages(message: Message) {
    for (const element of message.elements) {
      if (element.elementType === ElementType.picElement) {
        log("撤回消息含有图片");
        const picElement = element.picElement as PicElement;
        // 如果启用了重定向图片路径，并且是从持久化文件中找到的，则覆盖消息中的图片路径
        if (configManager.value.message.preventRecall.redirectPicPath) {
          const fileName = path.basename(picElement.sourcePath);
          picElement.sourcePath = path.join(this.LOCAL_REDIRECT_PIC_PATH, fileName);
          if (picElement.thumbPath instanceof Map) {
            for (const key of picElement.thumbPath.keys()) {
              picElement.thumbPath.set(key, path.join(this.LOCAL_REDIRECT_PIC_PATH, fileName));
            }
          }
        } else {
          if (picElement.thumbPath instanceof Map) {
            for (const key of picElement.thumbPath.keys()) {
              picElement.thumbPath.set(key, picElement.sourcePath);
            }
          }
        }
        this.fetchImageToLocal(picElement);
      }
    }
  }

  private async fetchImageToLocal(picElement: PicElement) {
    const downloadUrl = await getImageUrl(picElement);
    if (downloadUrl) {
      const md5HexStr = picElement.md5HexStr;
      const localPath = picElement.sourcePath;
      if (this.downloadingPics.has(md5HexStr)) {
        log("图片正在下载", md5HexStr);
        return;
      }
      this.downloadingPics.add(md5HexStr);
      log("下载图片", md5HexStr);
      try {
        const res = await fetch(downloadUrl);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(localPath, Buffer.from(buffer));
        log("下载图片成功", md5HexStr);
      } catch (e: any) {
        log("下载图片失败", md5HexStr, e?.message);
      } finally {
        this.downloadingPics.delete(md5HexStr);
      }
    } else {
      log("获取图片地址失败", picElement.sourcePath);
    }
  }

  static createRecallData(message: Message) {
    const recallInfo = MsgStore.getRecallInfo(message)!;
    return {
      operatorNick: recallInfo.operatorNick,
      operatorRemark: recallInfo.operatorRemark,
      operatorMemRemark: recallInfo.operatorMemRemark,
      origMsgSenderNick: recallInfo.origMsgSenderNick,
      origMsgSenderRemark: recallInfo.origMsgSenderRemark,
      origMsgSenderMemRemark: recallInfo.origMsgSenderMemRemark,
      recallTime: message.recallTime,
    };
  }

  static getRecallInfo(message: Message): RecallElement | null {
    if (message.elements.length === 1) {
      if (message.elements[0]?.grayTipElement?.subElementType === 1) {
        return message.elements[0].grayTipElement.revokeElement;
      }
    }
    return null;
  }

  get recallCacheSize() {
    const size = this.activeRecallCache.size + this.persistedFiles.reduce((acc, item) => acc + item.info.msgCount, 0);
    return size;
  }

  get ready() {
    return this.isReady;
  }

  addMessageToCache(message: Message) {
    // 不是完整消息
    if (!message.elements.length) {
      return;
    }
    this.recentMessages.set(message.msgId, message);
    if (this.recentMessages.size >= this.MAX_RECALL_CACHE_SIZE) {
      this.recentMessages.delete(this.recentMessages.keys().next().value!);
    }
  }

  findRecallMsg(message: Message) {
    const msgId = message.msgId;
    const recallTime = Number(message.recallTime) * 1000;

    let hit =
      this.recentMessages.get(msgId) ||
      this.activeRecallCache.get(msgId) ||
      this.getMessageFromPersisted(msgId, recallTime);

    if (!hit) return null;

    // 命中 recentMessages 的情况
    if (this.recentMessages.has(msgId) && !this.activeRecallCache.has(msgId)) {
      hit.lt_recall = MsgStore.createRecallData(message);
      this.processMsgImages(hit);
      this.recentMessages.delete(msgId);
      this.activeRecallCache.set(msgId, hit);
      log("命中缓存", msgId, hit);

      if (settingWindow?.isDestroyed() === false) {
        settingWindow.webContents.send("lite_tools.updateRecallCacheSize", this.recallCacheSize);
      }

      if (configManager.value.message.preventRecall.persistedFiles) {
        if (this.activeRecallCache.size >= this.MAX_MESSAGES_PER_FILE) {
          this.saveToPersistedFile(Date.now());
          fs.writeFileSync(path.join(this.LOCAL_DATA_PATH, "activeRecallCache.bin"), Buffer.alloc(0));
          this.activeRecallCache.clear();
        } else {
          this.saveToTempFile(hit);
        }
      }
    } else {
      log("命中持久化文件", msgId, hit);
    }
    return hit;
  }
}

const msgStore = new MsgStore();

function preventRecall(msgList: Message[]) {
  if (!msgStore.ready) return;
  const recallMsgIds: RecallMsgId[] = [];
  for (let index = 0; index < msgList.length; index++) {
    const message = msgList[index];
    const recallInfo = MsgStore.getRecallInfo(message);
    if (recallInfo) {
      log("找到撤回标记");
      if (recallInfo.isSelfOperate && !configManager.value.message.preventRecall.preventSelfMsg) {
        log("不处理自己撤回的消息");
        continue;
      }
      const recallMsg = msgStore.findRecallMsg(message);
      if (recallMsg) {
        msgList[index] = recallMsg;
        recallMsgIds.push(recallMsg.msgId);
      }
    } else {
      msgStore.addMessageToCache(message);
    }
  }
  if (recallMsgIds.length) {
    globalBroadcast("lite_tools.recallMessagesFound", recallMsgIds);
  }
}

export { preventRecall };
