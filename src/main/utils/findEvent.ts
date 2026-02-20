export function findEvent(args: any, eventName: string | string[]) {
  if (args[2] instanceof Object && args[2]?.cmdName) {
    if (Array.isArray(eventName)) {
      return eventName.includes(args[2].cmdName);
    } else {
      return args[2].cmdName === eventName;
    }
  } else {
    return false;
  }
}
