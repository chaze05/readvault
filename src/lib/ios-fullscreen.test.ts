import { describe, expect, it } from "vitest";

import { isIosDevice, shouldShowIosFullscreenHint } from "./ios-fullscreen";

const iphoneSafari =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const iphoneBrave =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.190 Mobile/15E148 Safari/604.1";
const iphoneFirefox =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15";
const androidChrome =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const ipadDesktopMode =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";

describe("isIosDevice", () => {
  it("detects iPhone browsers including Brave and Firefox", () => {
    expect(isIosDevice({ userAgent: iphoneSafari })).toBe(true);
    expect(isIosDevice({ userAgent: iphoneBrave })).toBe(true);
    expect(isIosDevice({ userAgent: iphoneFirefox })).toBe(true);
  });

  it("detects iPad desktop-mode user agents only with touch points", () => {
    expect(isIosDevice({ userAgent: ipadDesktopMode, maxTouchPoints: 5 })).toBe(true);
    expect(isIosDevice({ userAgent: ipadDesktopMode, maxTouchPoints: 0 })).toBe(false);
  });

  it("does not flag Android", () => {
    expect(isIosDevice({ userAgent: androidChrome, maxTouchPoints: 5 })).toBe(false);
  });
});

describe("shouldShowIosFullscreenHint", () => {
  it("shows the help for iPhone browsers in a normal browser tab", () => {
    expect(
      shouldShowIosFullscreenHint({
        userAgent: iphoneBrave,
        navigatorStandalone: false,
        displayModeStandalone: false,
        displayModeFullscreen: false,
      })
    ).toBe(true);
  });

  it("hides the help when installed standalone or already fullscreen", () => {
    expect(
      shouldShowIosFullscreenHint({
        userAgent: iphoneSafari,
        navigatorStandalone: true,
      })
    ).toBe(false);
    expect(
      shouldShowIosFullscreenHint({
        userAgent: iphoneSafari,
        displayModeStandalone: true,
      })
    ).toBe(false);
    expect(
      shouldShowIosFullscreenHint({
        userAgent: iphoneSafari,
        displayModeFullscreen: true,
      })
    ).toBe(false);
  });

  it("never shows on non-iOS devices", () => {
    expect(
      shouldShowIosFullscreenHint({
        userAgent: androidChrome,
        maxTouchPoints: 5,
      })
    ).toBe(false);
  });
});
