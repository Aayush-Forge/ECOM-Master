import 'dotenv/config';
import * as Sentry from '@sentry/nestjs';

// An empty/missing SENTRY_DSN leaves the SDK disabled (no events are sent).
Sentry.init({
  dsn: process.env.SENTRY_DSN || undefined,
  environment: process.env.NODE_ENV ?? 'development',
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  // Payments app: don't ship auth headers, cookies, user info or request/response bodies.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
  },
});
