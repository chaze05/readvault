export interface IosDeviceInput {
  userAgent: string;
  maxTouchPoints?: number;
}

export interface IosFullscreenHintInput extends IosDeviceInput {
  navigatorStandalone?: boolean;
  displayModeStandalone?: boolean;
  displayModeFullscreen?: boolean;
}

export function isIosDevice({
  userAgent,
  maxTouchPoints = 0,
}: IosDeviceInput): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true;

  return /Macintosh/i.test(userAgent) && maxTouchPoints > 1;
}

export function shouldShowIosFullscreenHint({
  userAgent,
  maxTouchPoints = 0,
  navigatorStandalone = false,
  displayModeStandalone = false,
  displayModeFullscreen = false,
}: IosFullscreenHintInput): boolean {
  return (
    isIosDevice({ userAgent, maxTouchPoints }) &&
    !navigatorStandalone &&
    !displayModeStandalone &&
    !displayModeFullscreen
  );
}
