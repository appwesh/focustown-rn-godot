/**
 * Analytics hook for React components
 */

import { useCallback } from "react";
import * as analytics from "./service";
import type {
  ScreenName,
  SessionStartProperties,
  SessionEndProperties,
} from "./types";

export function useAnalytics() {
  const trackScreenView = useCallback((screenName: ScreenName) => {
    analytics.trackScreenView(screenName);
  }, []);

  const trackSessionStart = useCallback(
    (properties?: SessionStartProperties) => {
      analytics.trackSessionStart(properties);
    },
    []
  );

  const trackSessionEnd = useCallback((properties: SessionEndProperties) => {
    analytics.trackSessionEnd(properties);
  }, []);

  const track = useCallback(
    (eventName: string, properties?: Record<string, unknown>) => {
      analytics.track(eventName, properties);
    },
    []
  );

  return {
    trackScreenView,
    trackSessionStart,
    trackSessionEnd,
    track,
  };
}

