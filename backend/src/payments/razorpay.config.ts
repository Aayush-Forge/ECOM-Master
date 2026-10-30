export const RAZORPAY_CONFIG = {
  get keyId() {
    return process.env.RAZORPAY_KEY_ID || '';
  },
  get keySecret() {
    return process.env.RAZORPAY_KEY_SECRET || '';
  },
  get webhookSecret() {
    return process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || '';
  },
};
