declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
      // Add other grecaptcha methods if needed
    };
  }
}

export {}; // This file needs to be a module
