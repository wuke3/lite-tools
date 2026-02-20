type ConfigListener = (config: Config) => void;

enum InitStatus {
  Uninitialized,
  Initializing,
  Initialized,
}

class ConfigStore {
  private listeners: Set<ConfigListener> = new Set();
  private readyPromise: Promise<void>;
  private resolveReady: () => void;
  private status = InitStatus.Uninitialized;
  private config!: Config;

  constructor() {
    const { promise, resolve } = Promise.withResolvers<void>();
    this.readyPromise = promise;
    this.resolveReady = resolve;
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.config);
    }
  }

  private async setupConfig() {
    const config = await lite_tools.getConfig();
    this.config = config;

    lite_tools.onConfigChange((config) => {
      Object.assign(this.config, config);
      this.notify();
    });

    this.status = InitStatus.Initialized;
    this.resolveReady();
  }

  setConfig(update: Config) {
    Object.assign(this.config, update);
    lite_tools.updateConfig(this.config);
  }

  onChange(listener: ConfigListener) {
    if (!this.listeners.has(listener)) {
      this.listeners.add(listener);
    }
    return () => this.offChange(listener);
  }

  offChange(listener: ConfigListener) {
    this.listeners.delete(listener);
  }

  get ready() {
    if (this.status === InitStatus.Uninitialized && lite_tools.isInitialized() && location.hash !== "#/blank") {
      this.status = InitStatus.Initializing;
      this.setupConfig();
    }
    return this.readyPromise;
  }

  get value() {
    return this.config;
  }
}

const configStore = new ConfigStore();

export { configStore };
