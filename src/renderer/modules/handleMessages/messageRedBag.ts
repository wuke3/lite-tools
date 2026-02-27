import { createLogger } from "@/renderer/utils/createLogger";
import { configStore } from "@/renderer/modules/configStore";

const log = createLogger("messageRedBag");

// 扩展全局类型声明
declare global {
  interface Window {
    lite_tools: any;
    app: any;
  }
}

const grabedArray: string[] = [];
let antiDetectGroups: string[] = []; // 暂时停止监听的群
const antiDetectTime = 300000; // 默认暂停五分钟

// 缓存 authData，避免每次都遍历搜索
let cachedAuthData: any = null;

// 红包API响应类型
interface GrabRedBagResult {
  result: number;
  errMsg: string;
  grabRedBagRsp?: {
    recvdOrder: {
      amount: string;
    };
  };
}

// 消息API响应类型
interface SendMsgResult {
  result: number;
  errMsg: string;
}

/**
 * 获取 authData，带缓存机制
 * 第一次调用时会遍历搜索，之后直接返回缓存
 */
function getAuthData() {
  if (cachedAuthData) {
    return cachedAuthData;
  }
  
  // 先尝试旧版路径
  try {
    const oldPath = (window as any).app?.__vue_app__?.config?.globalProperties?.$store?.state?.common_Auth?.authData;
    if (oldPath && oldPath.uin) {
      log("使用旧版路径获取 authData 成功");
      cachedAuthData = oldPath;
      return cachedAuthData;
    }
  } catch (e) {
    log("旧版路径获取 authData 失败，尝试搜索...");
  }
  
  // 旧版路径失败，使用搜索
  const result = findShortestPathAndValue((window as any).app, "authData");
  if (result && result.value && result.value.uin) {
    log(`搜索到 authData，路径: ${result.path}`);
    cachedAuthData = result.value;
    return cachedAuthData;
  }
  
  log("无法获取 authData！");
  return null;
}

/**
 * [V4 优化版] - 查找对象中某个 key 的最短可访问路径及其对应的值
 *
 * 该算法使用广度优先搜索 (BFS) 来保证找到的路径层级最浅。
 * 它会忽略 Vue 内部的响应式依赖属性（如 dep, __v_raw, _value 等），
 * 从而避免产生超长的无效路径。
 *
 * @param {object} rootObject - 搜索的起始对象，例如 `app` 或 `window`。
 * @param {string} targetKey - 要查找的属性名，例如 "authData"。
 * @returns {{path: string, value: any}|null} - 返回一个包含最短路径和对应值的对象，如果找不到则返回 null。
 */
function findShortestPathAndValue(rootObject: any, targetKey: string) {
  log(`🚀 开始搜索 "${targetKey}" 的最短路径和值...`);

  // 定义需要忽略的属性名
  const ignoreProps = new Set([
    'dep', '__v_raw', '__v_skip', '_value', '__ob__',
    'prevDep', 'nextDep', 'prevSub', 'nextSub', 'deps', 'subs',
    '__vueParentComponent', 'parent', 'provides'
  ]);

  // 使用广度优先搜索 (BFS)
  const queue: { obj: any; path: string }[] = [{ obj: rootObject, path: 'app' }];
  const visited = new Set<any>();

  visited.add(rootObject);

  while (queue.length > 0) {
    const { obj, path } = queue.shift()!;

    // 检查当前对象是否直接包含目标 key
    if (obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, targetKey)) {
      const finalPath = `${path}.${targetKey}`;
      const finalValue = obj[targetKey];

      // 验证找到的值是否有效（对于 authData，需要有 uin 属性）
      if (finalValue && (targetKey !== 'authData' || finalValue.uin)) {
        log(`✅ 成功! 找到最短路径: ${finalPath}`);
        return { path: finalPath, value: finalValue };
      }
    }

    // 将子属性加入队列
    for (const prop in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, prop)) {
        if (ignoreProps.has(prop)) {
          continue;
        }

        try {
          const childObj = obj[prop];
          if (childObj && typeof childObj === 'object' && !visited.has(childObj)) {
            visited.add(childObj);
            const newPath = Array.isArray(obj) ? `${path}[${prop}]` : `${path}.${prop}`;
            queue.push({ obj: childObj, path: newPath });
          }
        } catch (e) {
          // 忽略访问出错的属性
        }
      }
    }
  }

  log(`❌ 搜索完成，未找到 "${targetKey}" 的可访问路径。`);
  return null;
}

/**
 * 处理红包消息
 * @param msgRecord 消息记录
 */
export async function handleRedBag(msgRecord: any) {
  // 检查是否是红包消息
  let wallEl: any = null;
  for (const msgElement of msgRecord.elements) {
    if (msgElement.elementType === 9) { // 说明是红包消息！
      log("收到了红包消息！！！");
      wallEl = msgElement.walletElement;
      log(wallEl); // 打印红包内容
      break;
    }
  }
  
  if (!wallEl) {
    // 不是红包消息，退出
    return;
  }
  
  if (grabedArray.includes(wallEl.billNo)) {
    log(`该红包已处理过，billNo: ${wallEl.billNo}`);
    return;
  }
  
  grabedArray.push(wallEl.billNo); // 这里使用数组来避免重复播报
  log(`新红包，billNo: ${wallEl.billNo}`);

  const authData = getAuthData();
  if (!authData) {
    log("无法获取 authData，退出");
    return;
  }
  log(`authData 获取成功，uin: ${authData.uin}`);

  // 收红包必要的数据
  const msgSeq = msgRecord.msgSeq;
  const recvUin = authData.uin; // 自己的QQ号
  const peerUid = msgRecord.peerUid; // 发红包的对象的peerUid
  const name = authData.nickName; // 应该是自己的名字
  const sendUin = msgRecord.senderUin; // 发送红包的QQ号
  const senderName = msgRecord.sendRemarkName || msgRecord.sendMemberName || msgRecord.sendNickName; // 发送者的名字
  const pcBody = wallEl.pcBody;
  const wishing = wallEl.receiver.title;
  const index = wallEl.stringIndex;
  const chatType = msgRecord.chatType; // 聊天类型，1是私聊，2是群聊
  const peerName = msgRecord.peerName; // 群聊名字
  const title = wallEl.receiver.title;
  const redChannel = wallEl.redChannel;
  const config = configStore.value.message.grabRedBag;
  
  // 根据 Send2WhoType 确定回馈消息发送目标
  // 0=自己(私聊) 1=我的手机(设备) 2=QQ好友(私聊) 3=群聊
  const send2WhoType = config.Send2WhoType || "0";
  let IsGroup: number, receiver: string;
  switch (send2WhoType) {
    case "1": // 我的手机
      IsGroup = 8; receiver = authData.uid; break;
    case "2": // QQ好友
      IsGroup = 1; receiver = config.Send2Who[0] || authData.uid; break;
    case "3": // 群聊
      IsGroup = 2; receiver = config.Send2Who[0] || authData.uid; break;
    default:  // 0=自己
      IsGroup = 1; receiver = authData.uid; break;
  }

  // 先判断黑白名单的类型
  log(`开始检查黑白名单，blockType: ${config.blockType}`);
  switch (config.blockType) {
    case "0":
      log("未启用黑白名单");
      break; // 说明未启用黑白名单

    case "1": { // 说明是白名单
      const titleLower = title.toLowerCase();
      const listenKeyWords = config.listenKeyWords as string[];
      const listenGroups = config.listenGroups as string[];
      const listenQQs = config.listenQQs as string[];
      const keyWordMatch = listenKeyWords.length === 0 || listenKeyWords.some(word => titleLower.includes(word.toLowerCase()));
      const groupMatch = listenGroups.length === 0 || listenGroups.includes(peerUid);
      const qqMatch = listenQQs.length === 0 || listenQQs.includes(sendUin);
      log(`白名单检查: title="${title}", keyWordMatch=${keyWordMatch}, groupMatch=${groupMatch}, qqMatch=${qqMatch}`);
      if (!(keyWordMatch && groupMatch && qqMatch)) {
        log("未同时满足关键字、白名单群和发送者条件，不抢红包");
        if (config.notifyOnBlocked) {
          await sendNotifyMsg(IsGroup, receiver, `[Grab RedBag]发现来自群"${peerName}(${peerUid})"成员:"${senderName}(${sendUin})"发送的红包，但未满足白名单条件，未领取。`);
        }
        return;
      }
      log("白名单检查通过");
      break;
    }
    case "2": { // 说明是黑名单
      const titleLower = title.toLowerCase();
      const avoidKeyWords = config.avoidKeyWords as string[];
      const avoidGroups = config.avoidGroups as string[];
      const avoidQQs = config.avoidQQs as string[];
      const hitKeyWord = avoidKeyWords.length > 0 && avoidKeyWords.some(word => titleLower.includes(word.toLowerCase()));
      const hitGroup = avoidGroups.length > 0 && avoidGroups.includes(peerUid);
      const hitQQ = avoidQQs.length > 0 && avoidQQs.includes(sendUin);
      log(`黑名单检查: title="${title}", hitKeyWord=${hitKeyWord}, hitGroup=${hitGroup}, hitQQ=${hitQQ}`);
      if (hitKeyWord || hitGroup || hitQQ) {
        log("检测到黑名单关键字、在黑名单群内或发送者在黑名单内，不抢红包");
        if (config.notifyOnBlocked) {
          await sendNotifyMsg(IsGroup, receiver, `[Grab RedBag]发现来自群"${peerName}(${peerUid})"成员:"${senderName}(${sendUin})"发送的红包，但命中黑名单，未领取。`);
        }
        return;
      }
      log("黑名单检查通过");
      break;
    }
  }

  if (config.notificationonly) {
    log("检测到已开启仅通知模式");
    await sendMsg(IsGroup, receiver, `[Grab RedBag]发现来自群"${peerName}(${peerUid})"成员:"${senderName}(${sendUin})"发送的红包！`);
    return;
  }

  // 还要检测是否开启特定时段禁止抢红包功能。
  if (config.stopGrabByTime) {
    // 检测时间段
    log(`检查时间段限制，开始: ${config.stopGrabStartTime} 结束: ${config.stopGrabEndTime}`);
    if (isCurrentTimeInRange(config.stopGrabStartTime, config.stopGrabEndTime)) {
      log("当前在禁止时间段内，退出");
      if (config.notifyOnBlocked) {
        await sendNotifyMsg(IsGroup, receiver, `[Grab RedBag]发现来自群"${peerName}(${peerUid})"成员:"${senderName}(${sendUin})"发送的红包，但当前处于禁抢时段，未领取。`);
      }
      return;
    }
  }
  
  // 检测是否在暂时监听名单内
  if (antiDetectGroups.includes(peerUid)) {
    log("当前群在暂停收红包的群内！不抢红包！");
    if (config.notifyOnBlocked) {
      await sendNotifyMsg(IsGroup, receiver, `[Grab RedBag]发现来自群"${peerName}(${peerUid})"成员:"${senderName}(${sendUin})"发送的红包，但该群因一分钱检测暂停抢红包，未领取。`);
    }
    return;
  }

  // 下面准备发送收红包消息
  log("准备抢红包");
  log(`===== 准备抢红包 =====`);
  log(`chatType: ${chatType}, peerUid: ${peerUid}, msgSeq: ${msgSeq}`);
  
  let randomDelayForSend = 0;
  if (config.useRandomDelay) {
    const lowerBound = parseInt(config.delayLowerBound) || 0;
    const upperBound = parseInt(config.delayUpperBound) || 0;
    const lowerBoundForSend = parseInt(config.delayLowerBoundForSend) || 0;
    const upperBoundForSend = parseInt(config.delayUpperBoundForSend) || 0;
    const randomDelay = upperBound > lowerBound
      ? Math.floor(Math.random() * (upperBound - lowerBound + 1)) + lowerBound
      : lowerBound;
    randomDelayForSend = upperBoundForSend > lowerBoundForSend
      ? Math.floor(Math.random() * (upperBoundForSend - lowerBoundForSend + 1)) + lowerBoundForSend
      : lowerBoundForSend;
    log(`等待随机时间${randomDelay}ms`);
    await sleep(randomDelay);
  }

  if (redChannel === 32) {
    // 说明是口令红包，要输出口令
    log(`口令红包，口令: ${title}`);
    const result = await lite_tools.nativeCall(
      {
        eventName: "ntApi",
        type: "request",
      },
      {
        cmdName: "nodeIKernelMsgService/sendMsg",
        cmdType: "invoke",
        payload: [
          {
            msgId: "0",
            peer: {
              chatType: chatType,
              peerUid: peerUid,
              guildId: ""
            },
            msgElements: [
              {
                elementType: 1,
                elementId: "",
                textElement: {
                  content: title,
                  atType: 0,
                  atUid: "",
                  atTinyId: "",
                  atNtUid: ""
                }
              }
            ],
            msgAttributeInfos: new Map()
          },
          null
        ]
      }
    ) as SendMsgResult;
    
    // 这里要做校验，如果消息发送失败了，那就得取消抢红包，以避免被禁言了的情况下抢到口令红包的情况。
    log("发送口令红包的口令，下面是发送口令回调结果");
    log(JSON.stringify(result));
    
    // 如果口令发送失败，比如被禁言，就不抢红包了
    if (result.result !== 0 || result.errMsg !== "") {
      log("口令发送失败，退出");
      return;
    }
    log("口令发送成功");
  }

  log("调用 grabRedBag API");
  const result = await lite_tools.nativeCall(
    {
      eventName: "ntApi",
      type: "request",
    },
    {
      cmdName: "nodeIKernelMsgService/grabRedBag",
      cmdType: "invoke",
      payload: [
        {
          grabRedBagReq: {
            recvUin: chatType === 1 ? recvUin : peerUid, // 私聊的话是自己Q号，群聊就是peerUid
            recvType: chatType,
            peerUid: peerUid, // 对方的uid
            name: name,
            pcBody: pcBody,
            wishing: wishing,
            msgSeq: msgSeq,
            index: index
          }
        },
        { timeout: 5000 }
      ]
    }
  ) as GrabRedBagResult;
  
  log("抢红包结果为");
  log(result);
  
  if (!result || !result.grabRedBagRsp) {
    log("result 为空或结构异常，API 调用可能失败");
    return;
  }

  // 下面给自己发送提示消息
  if (config.useSelfNotice) {
    log("准备给自己发送消息");
    if (result.grabRedBagRsp.recvdOrder.amount === "0") {
      log("红包金额为0，已被领完");
      await sendMsg(IsGroup, receiver, `[Grab RedBag]抢来自群"${peerName}(${peerUid})"成员:"${senderName}(${sendUin})"发送的红包时失败！红包已被领完！`);
    } else {
      // 这里先准备好需要用到的数据
      let amount = parseInt(result.grabRedBagRsp.recvdOrder.amount) / 100;
      log(`抢到红包金额: ${amount} 元`);

      // 检测收到的是不是一分钱
      if (amount === 0.01 && config.antiDetect) {
        log("检测到一分钱红包！暂停该群抢红包5分钟！");
        // 暂时不抢这个群的红包
        antiDetectGroups.push(peerUid);
        // 设置定时任务，定时删掉数组中的群
        setTimeout(() => {
          antiDetectGroups = antiDetectGroups.filter(pausedGroupUid => pausedGroupUid !== peerUid);
          log(`恢复监听群${peerName}(${peerUid})`);
        }, antiDetectTime);
        if (config.notifyOnBlocked) {
          await sendNotifyMsg(IsGroup, receiver, `[Grab RedBag]抢到来自群"${peerName}(${peerUid})"成员:"${senderName}(${sendUin})"发送的一分钱红包，已暂停该群抢红包5分钟。`);
        }
      }

      // 定义需要发送的消息
      const msg = config.receiveMsg
        .replace("%peerName%", peerName)
        .replace("%peerUid%", peerUid)
        .replace("%senderName%", senderName)
        .replace("%sendUin%", sendUin)
        .replace("%amount%", amount.toFixed(2));

      await sendMsg(IsGroup, receiver, msg);
    }
  }

  // 下面进行抢到红包的后续处理。没抢到则直接返回。
  if (result.grabRedBagRsp.recvdOrder.amount === "0") {
    log("红包金额为0，后续处理跳过");
    return;
  }

  // 下面给对方发送消息
  if (config.autoReply && config.thanksMsgs.length !== 0 && sendUin !== recvUin) { // 给对方发送消息。抢自己的红包不发送消息
    await sleep(randomDelayForSend);
    log(`准备给对方发送消息,随机延迟${randomDelayForSend}ms`);
    await sendMsg(chatType, peerUid, config.thanksMsgs[Math.floor(Math.random() * config.thanksMsgs.length)]); // 随机选一条发
  }

  // 抢完红包之后，记录下当前已抢的红包数量和总额
  config.totalRedBagNum += 1;
  config.totalAmount += parseInt(result.grabRedBagRsp!.recvdOrder.amount) / 100;
  // 更新完整的配置对象
  const newConfig = { ...configStore.value };
  newConfig.message.grabRedBag = config;
  configStore.setConfig(newConfig);
  log("========== handleRedBag 执行完成 ==========");
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(() => resolve(null), ms));
}

async function sendMsg(chatType: number, peerUid: string, content: string) {
  await lite_tools.nativeCall(
    {
      eventName: "ntApi",
      type: "request",
    },
    {
      cmdName: "nodeIKernelMsgService/sendMsg",
      cmdType: "invoke",
      payload: [
        {
          msgId: "0",
          peer: { chatType: chatType, peerUid: peerUid, guildId: "" },
          msgElements: [{
            elementType: 1,
            elementId: "",
            textElement: {
              content: content,
              atType: 0, "atUid": "", "atTinyId": "", "atNtUid": ""
            }
          }],
          msgAttributeInfos: new Map()
        },
        null
      ]
    }
  );
}

async function sendNotifyMsg(chatType: number, peerUid: string, content: string) {
  await sendMsg(chatType, peerUid, content);
}

function isCurrentTimeInRange(startTimeStr: string, endTimeStr: string) {
  // 获取当前时间
  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();

  // 将当前时间转换为分钟
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  // 将开始和结束时间转换为分钟
  const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
  const [endHours, endMinutes] = endTimeStr.split(':').map(Number);

  const startTimeInMinutes = startHours * 60 + startMinutes;
  const endTimeInMinutes = endHours * 60 + endMinutes;

  // 处理跨午夜的情况
  if (startTimeInMinutes < endTimeInMinutes) {
    // 时间段不跨越午夜
    return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
  } else {
    // 时间段跨越午夜
    return currentTimeInMinutes >= startTimeInMinutes || currentTimeInMinutes < endTimeInMinutes;
  }
}
