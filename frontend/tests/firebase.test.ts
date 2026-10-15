import { getApps } from "firebase/app";
import { initAnalytics } from "../lib/firebase";

test("analytics stays off unless explicitly enabled (no Installations request)", () => {
  expect(process.env.NEXT_PUBLIC_FIREBASE_ANALYTICS_ENABLED).toBeUndefined();
  expect(() => initAnalytics()).not.toThrow();
  // Nothing initialized Analytics, so no Firebase app should have spun up here.
  expect(getApps()).toHaveLength(0);
});
