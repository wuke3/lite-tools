const appIdToName = new Map([
  ["1109224783", "微博"],
  ["1109937557", "哔哩哔哩"],
]);

function convertMiniArkToWebArk(msgList: any[]) {
  for (const msgItem of msgList) {
    const msg_seq = msgItem.msgSeq;
    for (const msgElement of msgItem.elements) {
      try {
        if (msgElement?.arkElement?.bytesData) {
          const json = JSON.parse(msgElement.arkElement.bytesData);
          if (
            json?.prompt?.includes("[QQ小程序]") ||
            json?.prompt?.includes("[QQ小程序") ||
            json?.meta?.detail_1
          ) {
            const result = replaceArk(json, msg_seq);
            if (result) {
              msgElement.arkElement.bytesData = result;
            }
          }
        }
      } catch (e) {
      }
    }
  }
}

function replaceArk(json: any, msg_seq: any) {
  try {
    const detail = json.meta?.detail_1;
    if (!detail) {
      return JSON.stringify(json);
    }

    const qqdocurl = detail.qqdocurl || detail.url || detail.jumpUrl;
    if (!qqdocurl) {
      return JSON.stringify(json);
    }

    const appid = detail.appid;
    const hostUin = detail.host?.uin || detail.uin;
    const desc = detail.desc || "";
    const preview = detail.preview || detail.pic || "";
    const icon = detail.icon || "";
    const ctime = json.config?.ctime || Date.now();

    return JSON.stringify({
      app: "com.tencent.structmsg",
      config: json.config || {},
      desc: "新闻",
      extra: { app_type: 1, appid, msg_seq, uin: hostUin },
      meta: {
        news: {
          action: "",
          android_pkg_name: "",
          app_type: 1,
          appid,
          ctime,
          desc,
          jumpUrl: String(qqdocurl).replace(/\\/g, ""),
          preview,
          source_icon: icon,
          source_url: "",
          tag: getArkData(json),
          title: getArkData(json),
          uin: hostUin,
        },
      },
      prompt: `[分享]${getArkData(json)}`,
      ver: "0.0.0.1",
      view: "news",
    });
  } catch (e) {
    return JSON.stringify(json);
  }
}

function getArkData(json: any) {
  try {
    const detail = json.meta?.detail_1;
    if (!detail) {
      return "分享";
    }
    return (
      detail.title ||
      appIdToName.get(detail.appid) ||
      detail.desc ||
      detail.summary ||
      "分享"
    );
  } catch (e) {
    return "分享";
  }
}

export { convertMiniArkToWebArk };
