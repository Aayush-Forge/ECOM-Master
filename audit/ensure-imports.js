const fs = require('fs');

function addTopImport(file) {
  let s = fs.readFileSync(file, 'utf8');
  if (!s.includes("import { openAuthenticatedUrl } from '@/lib/utils'")) {
    s = "import { openAuthenticatedUrl } from '@/lib/utils';\n" + s;
    fs.writeFileSync(file, s, 'utf8');
    console.log('Added top import to ' + file);
  }
}

addTopImport('admin-portal/components/orders/order-list-view.jsx');
addTopImport('admin-portal/components/orders/order-detail-view.jsx');
addTopImport('admin-portal/app/(dashboard)/accounting/page.tsx');
