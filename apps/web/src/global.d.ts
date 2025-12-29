export {};

declare global {
  interface Window {
    __graphdownDebug?: {
      clearPersistence: () => Promise<void>;
    };
  }
}
