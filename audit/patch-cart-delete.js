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

// 1. Patch cart-drawer.jsx
patchFile(
  'components/layout/cart-drawer.jsx',
  "const key = cartKey(item.product_id, item.variation_id)",
  "const key = item.id || cartKey(item.product_id || item.productId, item.variation_id || item.variationId)"
);

// 2. Patch cart/page.js
patchFile(
  'app/cart/page.js',
  "const key = cartKey(item.product_id || item.productId, item.variation_id || item.variationId)",
  "const key = item.id || cartKey(item.product_id || item.productId, item.variation_id || item.variationId)"
);

// 3. Patch lib/cart-context.js
patchFile(
  'lib/cart-context.js',
  `  const findItem = (keyOrId, itemsList = []) => {
    return itemsList.find(
      i => i.id === keyOrId ||
        cartKey(i.productId || i.product_id, i.variationId || i.variation_id) === keyOrId
    )
  }`,
  `  const findItem = (keyOrId, itemsList = []) => {
    return itemsList.find(
      i => i.id === keyOrId ||
        cartKey(i.productId || i.product_id, i.variationId || i.variation_id) === keyOrId ||
        cartKey(i.product_id || i.productId, i.variation_id || i.variationId) === keyOrId ||
        i.productId === keyOrId ||
        i.product_id === keyOrId
    )
  }`
);

// 4. Patch backend cart.service.ts
patchFile(
  'backend/src/cart/cart.service.ts',
  `      return {
        id: ci.id,
        productId: ci.productId,
        variationId: ci.variationId || null,`,
  `      return {
        id: ci.id,
        productId: ci.productId,
        product_id: ci.productId,
        variationId: ci.variationId || null,
        variation_id: ci.variationId || null,`
);
