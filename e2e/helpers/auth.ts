import { Page, APIRequestContext } from '@playwright/test';

export const STOREFRONT_URL = 'http://localhost:3000';
export const ADMIN_URL = 'http://localhost:3001';
export const BACKEND_URL = 'http://localhost:5000';
export const RAZORPAY_TEST_SECRET = 'Y9thJkIcOkD90gh8jncph6zb';

export const USER_CREDENTIALS = {
  admin: {
    email: 'admin@sridattam.com',
    password: 'password123',
    role: 'admin',
    name: 'Admin User',
  },
  editor: {
    email: 'editor@sridattam.com',
    password: 'password123',
    role: 'editor',
    name: 'Editor User',
  },
  read_only: {
    email: 'read_only@sridattam.com',
    password: 'password123',
    role: 'read_only',
    name: 'Viewer User',
  },
  customer: {
    email: 'customer@sridattam.com',
    password: 'password123',
    role: 'customer',
    name: 'Customer User',
  },
};

export type RoleType = keyof typeof USER_CREDENTIALS;

/**
 * Fetch JWT tokens directly from backend for ultra-fast session hydration.
 */
export async function getAuthSession(request: APIRequestContext, role: RoleType) {
  const creds = USER_CREDENTIALS[role];
  const res = await request.post(`${BACKEND_URL}/auth/login`, {
    data: { email: creds.email, password: creds.password },
  });

  if (!res.ok()) {
    throw new Error(`Failed to login as ${role}: ${res.status()} ${await res.text()}`);
  }

  const data = await res.json();
  return {
    user: data.user,
    token: data.access_token,
    access_token: data.access_token,
    refreshToken: data.refresh_token,
    refresh_token: data.refresh_token,
  };
}

/**
 * Injects authenticated session into browser localStorage and cookie for instant, zero-delay testing.
 */
export async function authenticatePage(page: Page, request: APIRequestContext, role: RoleType, targetUrl: string) {
  const session = await getAuthSession(request, role);
  const origin = new URL(targetUrl).origin;

  await page.goto(`${origin}/login`);

  await page.evaluate((sess) => {
    const raw = JSON.stringify(sess);
    localStorage.setItem('auth_session', raw);
    document.cookie = `sd_auth_session=${encodeURIComponent(raw)}; path=/; max-age=604800`;
    window.dispatchEvent(new Event('auth-change'));
  }, session);

  await page.goto(targetUrl);
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Emulates a real Razorpay test checkout authorization and returns valid HMAC-SHA256 test signature.
 */
export async function setupRazorpayMock(page: Page) {
  await page.addInitScript(({ secret }) => {
    (window as any).Razorpay = function (options: any) {
      this.open = async () => {
        const orderId = options.order_id;
        const paymentId = `pay_test_${Date.now()}`;
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw',
          enc.encode(secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(`${orderId}|${paymentId}`));
        const signature = Array.from(new Uint8Array(sigBuf))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        if (typeof options.handler === 'function') {
          setTimeout(() => {
            options.handler({
              razorpay_order_id: orderId,
              razorpay_payment_id: paymentId,
              razorpay_signature: signature,
            });
          }, 300);
        }
      };
      this.on = () => {};
    };
  }, { secret: RAZORPAY_TEST_SECRET });
}
