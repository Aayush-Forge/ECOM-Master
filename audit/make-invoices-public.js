const fs = require('fs');
const path = require('path');

function replaceInFile(relPath, target, replacement) {
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
    console.log('Successfully updated ' + relPath);
  } else {
    console.error('Target not found in ' + relPath);
  }
}

// 1. backend/src/orders/orders.controller.ts
replaceInFile(
  'backend/src/orders/orders.controller.ts',
  `  @Roles(ROLES.READ_ONLY)
  @Get(':id/invoice')`,
  `  @Public()
  @Get(':id/invoice')`
);

replaceInFile(
  'backend/src/orders/orders.controller.ts',
  `  @Roles(ROLES.READ_ONLY)
  @Get(':id/shipping-label')`,
  `  @Public()
  @Get(':id/shipping-label')`
);

// 2. backend/src/orders/customer-orders.controller.ts
replaceInFile(
  'backend/src/orders/customer-orders.controller.ts',
  `  @Roles(ROLES.READ_ONLY)
  @Get(':id/invoice')`,
  `  @Public()
  @Get(':id/invoice')`
);

replaceInFile(
  'backend/src/orders/customer-orders.controller.ts',
  `  @Roles(ROLES.READ_ONLY)
  @Get(':id/shipping-label')`,
  `  @Public()
  @Get(':id/shipping-label')`
);
