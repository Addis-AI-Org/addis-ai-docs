// Product analytics for the docs: what developers read and where they go
// next. Sends to the developer portal's PostHog project, so a visitor who
// also uses addisassistant.com keeps one id (PostHog's cookie is set on
// .addisassistant.com). Mirrors the portal's src/instrumentation-client.ts.

import { ANALYTICS_ENABLED, ANALYTICS_ENVIRONMENT, installDocsListeners } from '@/lib/analytics';
import { cleanCapturedEvent } from '@/lib/analytics-privacy';
import { tagDocsEvent } from '@/lib/analytics-tags';
import { loadPostHog } from '@/lib/posthog-client';

/** Errors kept from before PostHog loads, at most. */
const MAX_EARLY_ERRORS = 10;

/**
 * Runs `task` once the page has loaded and the browser has a quiet moment.
 * Analytics is not needed to read the docs, so it waits instead of competing
 * with the page for the network and main thread.
 */
function whenIdle(task: () => void) {
  const schedule = () => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(task, { timeout: 3000 });
    } else {
      setTimeout(task, 1500);
    }
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
}

// PostHog reports unhandled errors once it has loaded (capture_exceptions).
// Errors from before then are held here and sent when it arrives.
const earlyErrors: unknown[] = [];
function holdError(event: ErrorEvent | PromiseRejectionEvent) {
  if (earlyErrors.length >= MAX_EARLY_ERRORS) return;
  earlyErrors.push(event instanceof ErrorEvent ? (event.error ?? event.message) : event.reason);
}

if (typeof window !== 'undefined' && ANALYTICS_ENABLED) {
  window.addEventListener('error', holdError);
  window.addEventListener('unhandledrejection', holdError);
  installDocsListeners();

  whenIdle(() => {
    void loadPostHog({
      api_host: '/ingest',
      ui_host: 'https://eu.posthog.com',
      defaults: '2026-01-30',
      capture_pageview: 'history_change',
      capture_pageleave: 'if_capture_pageview',
      autocapture: true,
      // Send unhandled errors and rejections to PostHog error tracking.
      capture_exceptions: true,
      person_profiles: 'identified_only',
      // Reading docs needs no replays.
      disable_session_recording: true,
      // Every URL leaves through an allowlist (no email, code, token or
      // search text), and every event says which app, deployment and docs
      // page it came from.
      before_send: (event) => tagDocsEvent(cleanCapturedEvent(event), ANALYTICS_ENVIRONMENT),
    }).then((posthog) => {
      window.removeEventListener('error', holdError);
      window.removeEventListener('unhandledrejection', holdError);
      for (const error of earlyErrors.splice(0)) {
        posthog?.captureException(error);
      }
    });
  });
}
