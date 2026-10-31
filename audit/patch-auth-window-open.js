const fs = require('fs');
const path = require('path');

function patchFile(relPath, target, replacement) {
  const fullPath = path.resolve(relPath);
  let content = fs.readFileSync(fullPath, 'utf8');
  const isCRLF = content.includes('\r\n');
  content = content.replace(/\r\n/g, '\n');
  const targetNorm = target.replace(/\r\n/g, '\n');
  const repNorm = replacement.replace(/\r\n/g, '\n');

  if (content.includes(targetNorm)) {
    content = content.replace(targetNorm, repNorm);
    if (isCRLF) content = content.replace(/\n/g, '\r\n');
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Successfully patched ${relPath}`);
  } else {
    console.error(`Target not found in ${relPath}`);
  }
}

// 1. Patch admin-portal/components/orders/order-list-view.jsx
patchFile(
  'admin-portal/components/orders/order-list-view.jsx',
  "import { cn } from '@/lib/utils'",
  "import { cn, openAuthenticatedUrl } from '@/lib/utils'"
);
patchFile(
  'admin-portal/components/orders/order-list-view.jsx',
  "onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/admin/orders/${order.id}/invoice`, '_blank')}",
  "onClick={() => openAuthenticatedUrl(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/admin/orders/${order.id}/invoice`)}"
);
patchFile(
  'admin-portal/components/orders/order-list-view.jsx',
  "onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/admin/orders/${order.id}/shipping-label`, '_blank')}",
  "onClick={() => openAuthenticatedUrl(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/admin/orders/${order.id}/shipping-label`)}"
);

// 2. Patch admin-portal/components/orders/order-detail-view.jsx
patchFile(
  'admin-portal/components/orders/order-detail-view.jsx',
  "import { cn } from '@/lib/utils'",
  "import { cn, openAuthenticatedUrl } from '@/lib/utils'"
);
// replace all 4 instances
let detailContent = fs.readFileSync('admin-portal/components/orders/order-detail-view.jsx', 'utf8');
detailContent = detailContent.replaceAll(
  "window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/admin/orders/${order.id}/invoice`, '_blank')",
  "openAuthenticatedUrl(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/admin/orders/${order.id}/invoice`)"
);
detailContent = detailContent.replaceAll(
  "window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/admin/orders/${order.id}/shipping-label`, '_blank')",
  "openAuthenticatedUrl(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/admin/orders/${order.id}/shipping-label`)"
);
fs.writeFileSync('admin-portal/components/orders/order-detail-view.jsx', detailContent, 'utf8');
console.log('Successfully updated order-detail-view.jsx');

// 3. Patch admin-portal/app/(dashboard)/accounting/page.tsx
patchFile(
  'admin-portal/app/(dashboard)/accounting/page.tsx',
  "import { cn } from '@/lib/utils';",
  "import { cn, openAuthenticatedUrl } from '@/lib/utils';"
);
let acctContent = fs.readFileSync('admin-portal/app/(dashboard)/accounting/page.tsx', 'utf8');
acctContent = acctContent.replaceAll(
  "window.open(`${API_BASE_URL}/admin/orders/${order.dbId}/invoice`, '_blank')",
  "openAuthenticatedUrl(`${API_BASE_URL}/admin/orders/${order.dbId}/invoice`)"
);
acctContent = acctContent.replaceAll(
  "window.open(`${API_BASE_URL}/admin/orders/${order.dbId}/shipping-label`, '_blank')",
  "openAuthenticatedUrl(`${API_BASE_URL}/admin/orders/${order.dbId}/shipping-label`)"
);
acctContent = acctContent.replaceAll(
  "window.open(`${API_BASE_URL}/admin/orders/${selectedOrder.dbId}/invoice`, '_blank')",
  "openAuthenticatedUrl(`${API_BASE_URL}/admin/orders/${selectedOrder.dbId}/invoice`)"
);
acctContent = acctContent.replaceAll(
  "window.open(`${API_BASE_URL}/admin/orders/${selectedOrder.dbId}/shipping-label`, '_blank')",
  "openAuthenticatedUrl(`${API_BASE_URL}/admin/orders/${selectedOrder.dbId}/shipping-label`)"
);
acctContent = acctContent.replaceAll(
  "window.open(url, '_blank');",
  "openAuthenticatedUrl(url);"
);
fs.writeFileSync('admin-portal/app/(dashboard)/accounting/page.tsx', acctContent, 'utf8');
console.log('Successfully updated accounting/page.tsx');
