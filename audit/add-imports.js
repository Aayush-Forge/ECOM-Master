const fs = require('fs');

// 1. order-list-view.jsx
let olv = fs.readFileSync('admin-portal/components/orders/order-list-view.jsx', 'utf8');
if (!olv.includes('openAuthenticatedUrl')) {
  olv = "import { openAuthenticatedUrl } from '@/lib/utils'\n" + olv;
  fs.writeFileSync('admin-portal/components/orders/order-list-view.jsx', olv, 'utf8');
  console.log('Added import to order-list-view.jsx');
}

// 2. order-detail-view.jsx
let odv = fs.readFileSync('admin-portal/components/orders/order-detail-view.jsx', 'utf8');
if (!odv.includes('openAuthenticatedUrl')) {
  odv = "import { openAuthenticatedUrl } from '@/lib/utils'\n" + odv;
  fs.writeFileSync('admin-portal/components/orders/order-detail-view.jsx', odv, 'utf8');
  console.log('Added import to order-detail-view.jsx');
}

// 3. accounting/page.tsx
let acct = fs.readFileSync('admin-portal/app/(dashboard)/accounting/page.tsx', 'utf8');
if (!acct.includes('openAuthenticatedUrl')) {
  acct = "import { openAuthenticatedUrl } from '@/lib/utils';\n" + acct;
  fs.writeFileSync('admin-portal/app/(dashboard)/accounting/page.tsx', acct, 'utf8');
  console.log('Added import to accounting/page.tsx');
}
