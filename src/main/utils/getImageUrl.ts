import { configManager } from "@/main/modules/configManager";
import { createLogger } from "@/main/utils/createLogger";

type PicElement = any;

type RkeyData = {
  private_rkey: string;
  group_rkey: string;
  expired_time: number;
};

const IMAGE_HOST = "https://gchat.qpic.cn";
const IMAGE_HOST_NT = "https://multimedia.nt.qq.com.cn";
const log = createLogger("getImageUrl");
const rkeyData = {
  private_rkey: "",
  group_rkey: "",
  expired_time: 0,
};

let pendingRkeyPromise: Promise<void> | null = null;

async function getImageUrl(picElement: PicElement): Promise<string | null> {
  const { originImageUrl: url, md5HexStr } = picElement;

  if (!url) {
    if (md5HexStr) {
      return `${IMAGE_HOST}/gchatpic_new/0/0-0-${md5HexStr.toUpperCase()}/0`;
    }
    return null;
  }

  const parsedUrl = new URL(IMAGE_HOST + url);
  const imageAppid = parsedUrl.searchParams.get("appid");

  if (!imageAppid || !["1406", "1407"].includes(imageAppid)) {
    return IMAGE_HOST + url;
  }

  let rkey = parsedUrl.searchParams.get("rkey");
  if (!rkey) {
    const rkeyType = imageAppid === "1406" ? "private_rkey" : "group_rkey";
    rkey = await getRkey(rkeyType);
  }

  return IMAGE_HOST_NT + url + (rkey || "");
}

async function getRkey(type: "private_rkey" | "group_rkey") {
  const now = Date.now();

  if (now <= rkeyData.expired_time) {
    log("rkey未过期，使用缓存");
    return rkeyData[type];
  }

  // 如果已有请求在进行，等待它完成
  if (pendingRkeyPromise) {
    await pendingRkeyPromise;
    return rkeyData[type];
  }

  // 发起新的请求
  pendingRkeyPromise = (async () => {
    try {
      const res = await fetch(configManager.value.global.rkeyServerUrl);
      const data = await res.json();
      const { expired_time, private_rkey, group_rkey } = data as RkeyData;
      rkeyData.expired_time = expired_time * 1000;
      rkeyData.private_rkey = private_rkey;
      rkeyData.group_rkey = group_rkey;
      log("rkey更新成功", data);
    } catch (err) {
      log("获取rkey失败", err);
    } finally {
      pendingRkeyPromise = null;
    }
  })();

  await pendingRkeyPromise;
  return rkeyData[type];
}

export { getImageUrl };
