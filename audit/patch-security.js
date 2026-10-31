const fs = require('fs');
const path = require('path');

const BACKEND_SRC = path.join(__dirname, '..', 'backend', 'src');

// 1. Patch orders.controller.ts
{
  const filePath = path.join(BACKEND_SRC, 'orders', 'orders.controller.ts');
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/@Public\(\)\r?\n\s*@Get\(':id\/invoice'\)/, "@Roles(ROLES.READ_ONLY)\n  @Get(':id/invoice')");
  content = content.replace(/@Public\(\)\r?\n\s*@Get\(':id\/shipping-label'\)/, "@Roles(ROLES.READ_ONLY)\n  @Get(':id/shipping-label')");
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('1. Patched backend/src/orders/orders.controller.ts');
}

// 2. Patch accounting.controller.ts
{
  const filePath = path.join(BACKEND_SRC, 'accounting', 'accounting.controller.ts');
  let content = fs.readFileSync(filePath, 'utf8');
  // Remove @Public() from accounting controller
  content = content.replace(/@Public\(\)\r?\n\s*@Roles\(ROLES\.READ_ONLY\)/g, "@Roles(ROLES.ADMIN)");
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('2. Patched backend/src/accounting/accounting.controller.ts');
}

// 3. Patch shipping.controller.ts (Shipping slabs strictly for ADMIN)
{
  const filePath = path.join(BACKEND_SRC, 'shipping', 'shipping.controller.ts');
  let content = fs.readFileSync(filePath, 'utf8');
  // Change ROLES.EDITOR to ROLES.ADMIN
  content = content.replace(/@Roles\(ROLES\.EDITOR\)/g, "@Roles(ROLES.ADMIN)");
  // Also protect findAll and findOne with ROLES.ADMIN
  content = content.replace(/@Roles\(ROLES\.READ_ONLY\)\r?\n\s*@Get\(\)/, "@Roles(ROLES.ADMIN)\n  @Get()");
  content = content.replace(/@Roles\(ROLES\.READ_ONLY\)\r?\n\s*@Get\(':id'\)/, "@Roles(ROLES.ADMIN)\n  @Get(':id')");
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('3. Patched backend/src/shipping/shipping.controller.ts');
}
