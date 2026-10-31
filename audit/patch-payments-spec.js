const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'backend', 'src', 'payments', 'payments.service.spec.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize to LF first
const isCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

if (!content.includes('getValidSignature')) {
  content = content.replace(
    "import { RAZORPAY_CONFIG } from './razorpay.config.js';",
    `import { RAZORPAY_CONFIG } from './razorpay.config.js';
import { createHmac } from 'crypto';

const getValidSignature = (razorpayOrderId: string, razorpayPaymentId: string) => {
  if (!RAZORPAY_CONFIG.keySecret) return 'sig_test';
  return createHmac('sha256', RAZORPAY_CONFIG.keySecret)
    .update(\`\${razorpayOrderId}|\${razorpayPaymentId}\`)
    .digest('hex');
};`
  );
}

// In test 1:
content = content.replace(
  "razorpaySignature: 'sig_1',",
  "razorpaySignature: getValidSignature('rzp_order_1', 'rzp_pay_1'),"
);
content = content.replace(
  "razorpaySignature: 'sig_1',",
  "razorpaySignature: getValidSignature('rzp_order_1', 'rzp_pay_1'),"
);

// In test 2:
content = content.replace(
  `razorpayOrderId: 'order_rzp_1',
        razorpayPaymentId: 'pay_rzp_1',
        razorpaySignature: 'sig_test',`,
  `razorpayOrderId: 'order_rzp_1',
        razorpayPaymentId: 'pay_rzp_1',
        razorpaySignature: getValidSignature('order_rzp_1', 'pay_rzp_1'),`
);

// In test 3:
content = content.replace(
  `razorpayOrderId: 'order_rzp_race',
        razorpayPaymentId: 'pay_rzp_race',
        razorpaySignature: 'sig_test',`,
  `razorpayOrderId: 'order_rzp_race',
        razorpayPaymentId: 'pay_rzp_race',
        razorpaySignature: getValidSignature('order_rzp_race', 'pay_rzp_race'),`
);

if (isCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched payments.service.spec.ts');
