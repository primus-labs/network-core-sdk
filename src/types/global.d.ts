export { };

declare global {
  interface Window {
    primus?: any;
  }
  const __SDK_VERSION__: string;
}