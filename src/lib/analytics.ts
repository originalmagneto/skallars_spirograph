export type AnalyticsEventPayload = {
  eventType: string;
  page?: string;
  blockId?: string;
  articleId?: string;
  label?: string;
  href?: string;
  metadata?: Record<string, any>;
};

export const trackEvent = async (payload: AnalyticsEventPayload) => {
  try {
    await fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // non-blocking
  }
};
