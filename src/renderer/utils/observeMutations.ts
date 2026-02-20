type Options = {
  autoDisconnect?: number;
  attributes?: boolean;
  attributeFilter?: string[];
  characterData?: boolean;
  childList?: boolean;
  subtree?: boolean;
};

type ObserverCallback = (mutationsList: MutationRecord[], observer: MutationObserver) => void;
type offObserver = () => void;

function observeMutations(target: HTMLElement, callback: ObserverCallback, options: Options = {}): offObserver {
  if (!target || !callback) {
    return () => {};
  }
  const observer = new MutationObserver((mutationsList) => {
    callback(mutationsList, observer);
  });

  observer.observe(target, {
    attributes: options.attributes ?? false,
    attributeFilter: options.attributeFilter ?? undefined,
    characterData: options.characterData ?? false,
    childList: options.childList ?? false,
    subtree: options.subtree ?? false,
  });

  if (options.autoDisconnect && options.autoDisconnect > 0) {
    setTimeout(() => observer.disconnect(), options.autoDisconnect);
  }

  return () => observer.disconnect();
}

export { observeMutations };
