const fs = require('fs');

function fixDirective(file, directive) {
  let s = fs.readFileSync(file, 'utf8');
  s = s.replace(/\r\n/g, '\n');
  
  // Remove directive and import
  s = s.replace(directive + '\n', '');
  s = s.replace("import { openAuthenticatedUrl } from '@/lib/utils';\n", '');

  // Add directive at line 1, then import
  s = directive + "\n\nimport { openAuthenticatedUrl } from '@/lib/utils';\n" + s;

  fs.writeFileSync(file, s, 'utf8');
  console.log('Fixed ' + file);
}

fixDirective('admin-portal/components/orders/order-list-view.jsx', "'use client'");
fixDirective('admin-portal/components/orders/order-detail-view.jsx', "'use client'");
fixDirective('admin-portal/app/(dashboard)/accounting/page.tsx', '"use client";');
