/**
 * Verification test suite for 3-Tier Role Hierarchy (ESM)
 */

import { ROLES, ROLE_RANKS, ROLE_LABELS, getRoleRank, hasRole, requireRole, getRoleLabel } from './lib/roles.js';
import { getAllUsersSync, updateUserRole } from './lib/api/users.js';
import { initiateRefund } from './lib/api/orders.js';
import { createProduct, updateProduct, deleteProduct } from './lib/api/products-api.js';
import { createDiscount, updateDiscount, deleteDiscount } from './lib/api/discounts.js';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${message}`);
    failCount++;
  }
}

function assertThrows(fn, expectedCode, message) {
  try {
    fn();
    console.error(`[FAIL] ${message} (Expected error but function succeeded)`);
    failCount++;
  } catch (err) {
    if (expectedCode && err.code !== expectedCode && err.status !== expectedCode) {
      console.error(`[FAIL] ${message} (Got error ${err.code || err.status}, expected ${expectedCode})`);
      failCount++;
    } else {
      console.log(`[PASS] ${message}`);
      passCount++;
    }
  }
}

async function assertAsyncThrows(fn, expectedCode, message) {
  try {
    await fn();
    console.error(`[FAIL] ${message} (Expected error but function succeeded)`);
    failCount++;
  } catch (err) {
    if (expectedCode && err.code !== expectedCode && err.status !== expectedCode) {
      console.error(`[FAIL] ${message} (Got error ${err.code || err.status}, expected ${expectedCode})`);
      failCount++;
    } else {
      console.log(`[PASS] ${message}`);
      passCount++;
    }
  }
}

async function runTests() {
  console.log('=== TEST 1: Role Ranks & Hierarchy Values ===');
  assert(getRoleRank('admin') === 3, 'admin rank is 3');
  assert(getRoleRank('editor') === 2, 'editor rank is 2');
  assert(getRoleRank('read_only') === 1, 'read_only rank is 1');
  assert(getRoleRank('employee') === 1, 'legacy employee rank is normalized to 1');
  assert(getRoleRank('customer') === 0, 'customer rank is 0');
  assert(getRoleRank('unknown') === 0, 'unknown rank is 0');

  console.log('\n=== TEST 2: Role Labels (Viewer Employee / Editor Employee / Admin) ===');
  assert(getRoleLabel('admin') === 'Admin', 'admin label is Admin');
  assert(getRoleLabel('editor') === 'Editor Employee', 'editor label is Editor Employee');
  assert(getRoleLabel('read_only') === 'Viewer Employee', 'read_only label is Viewer Employee');
  assert(getRoleLabel('employee') === 'Viewer Employee', 'legacy employee label is Viewer Employee');
  assert(getRoleLabel('customer') === 'Customer', 'customer label is Customer');

  console.log('\n=== TEST 3: hasRole Hierarchy Logic ===');
  assert(hasRole('admin', 'editor') === true, 'admin qualifies for editor (3 >= 2)');
  assert(hasRole('admin', 'read_only') === true, 'admin qualifies for read_only (3 >= 1)');
  assert(hasRole('editor', 'editor') === true, 'editor qualifies for editor (2 >= 2)');
  assert(hasRole('editor', 'read_only') === true, 'editor qualifies for read_only (2 >= 1)');
  assert(hasRole('editor', 'admin') === false, 'editor does not qualify for admin (2 < 3)');
  assert(hasRole('read_only', 'editor') === false, 'read_only does not qualify for editor (1 < 2)');
  assert(hasRole('read_only', 'read_only') === true, 'read_only qualifies for read_only (1 >= 1)');
  assert(hasRole({ role: 'editor' }, 'editor') === true, 'User object with role editor qualifies for editor');
  assert(hasRole({ role: 'read_only' }, 'editor') === false, 'User object with role read_only fails editor');

  console.log('\n=== TEST 4: requireRole Authorization Enforcement ===');
  assert(requireRole('editor', { role: 'admin' }) === true, 'requireRole succeeds for admin on editor requirement');
  assert(requireRole('editor', { role: 'editor' }) === true, 'requireRole succeeds for editor on editor requirement');
  assertThrows(() => requireRole('editor', { role: 'read_only' }), 'FORBIDDEN_INSUFFICIENT_ROLE', 'requireRole throws 403 for read_only on editor requirement');
  assertThrows(() => requireRole('editor', { role: 'customer' }), 'FORBIDDEN_INSUFFICIENT_ROLE', 'requireRole throws 403 for customer on editor requirement');

  console.log('\n=== TEST 5: User Model Migration to read_only ===');
  const users = getAllUsersSync();
  const priya = users.find(u => u.name === 'Priya Patel');
  const rahul = users.find(u => u.name === 'Rahul Verma');
  const aayush = users.find(u => u.name === 'Aayush Sharma');
  assert(priya && priya.role === 'read_only', 'Priya Patel (legacy employee) migrated to read_only');
  assert(rahul && rahul.role === 'read_only', 'Rahul Verma (legacy employee) migrated to read_only');
  assert(aayush && aayush.role === 'admin', 'Aayush Sharma preserved as admin');

  console.log('\n=== TEST 6: Backend Endpoint - initiateRefund ===');
  const refundAdmin = await initiateRefund('ord_002', 100, 'Test Refund', { role: 'admin' });
  assert(refundAdmin.success === true, 'Refund succeeds for admin user');
  const refundEditor = await initiateRefund('ord_003', 100, 'Test Refund', { role: 'editor' });
  assert(refundEditor.success === true, 'Refund succeeds for editor user');
  await assertAsyncThrows(
    () => initiateRefund('ord_004', 100, 'Test Refund', { role: 'read_only' }),
    'FORBIDDEN_INSUFFICIENT_ROLE',
    'Refund blocked for read_only (Viewer Employee)'
  );

  console.log('\n=== TEST 7: Backend Endpoint - Product CRUD ===');
  const createdProd = await createProduct({ title: 'Test Agarbatti', sku: 'TEST-01', price: 299 }, { role: 'editor' });
  assert(createdProd && createdProd.id, 'Product creation succeeds for editor');
  const updatedProd = await updateProduct(createdProd.id, { price: 349 }, { role: 'admin' });
  assert(updatedProd && updatedProd.price === 349, 'Product update succeeds for admin');
  const deletedProd = await deleteProduct(createdProd.id, { role: 'editor' });
  assert(deletedProd.success === true, 'Product deletion succeeds for editor');

  await assertAsyncThrows(
    () => createProduct({ title: 'Blocked Agarbatti', sku: 'BLOCKED-01', price: 299 }, { role: 'read_only' }),
    'FORBIDDEN_INSUFFICIENT_ROLE',
    'Product creation blocked for read_only (Viewer Employee)'
  );
  await assertAsyncThrows(
    () => updateProduct('prod_001', { price: 999 }, { role: 'read_only' }),
    'FORBIDDEN_INSUFFICIENT_ROLE',
    'Product update blocked for read_only (Viewer Employee)'
  );
  await assertAsyncThrows(
    () => deleteProduct('prod_001', { role: 'read_only' }),
    'FORBIDDEN_INSUFFICIENT_ROLE',
    'Product deletion blocked for read_only (Viewer Employee)'
  );

  console.log('\n=== TEST 8: Backend Endpoint - Discount CRUD ===');
  const createdDisc = await createDiscount({ name: 'Festive 20', type: 'percentage', discountValue: 20, displayValue: '20% OFF', conditions: 'Min spend 1000' }, { role: 'editor' });
  assert(createdDisc && createdDisc.id, 'Discount creation succeeds for editor');
  const updatedDisc = await updateDiscount(createdDisc.id, { discountValue: 25 }, { role: 'admin' });
  assert(updatedDisc && updatedDisc.discountValue === 25, 'Discount update succeeds for admin');
  const deletedDisc = await deleteDiscount(createdDisc.id, { role: 'editor' });
  assert(deletedDisc.success === true, 'Discount deletion succeeds for editor');

  await assertAsyncThrows(
    () => createDiscount({ name: 'Blocked Disc', type: 'percentage', discountValue: 10, displayValue: '10%' }, { role: 'read_only' }),
    'FORBIDDEN_INSUFFICIENT_ROLE',
    'Discount creation blocked for read_only (Viewer Employee)'
  );
  await assertAsyncThrows(
    () => updateDiscount('disc_001', { discountValue: 50 }, { role: 'read_only' }),
    'FORBIDDEN_INSUFFICIENT_ROLE',
    'Discount update blocked for read_only (Viewer Employee)'
  );
  await assertAsyncThrows(
    () => deleteDiscount('disc_001', { role: 'read_only' }),
    'FORBIDDEN_INSUFFICIENT_ROLE',
    'Discount deletion blocked for read_only (Viewer Employee)'
  );

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passCount} Passed, ${failCount} Failed`);
  console.log(`========================================`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Unhandled error in test suite:', err);
  process.exit(1);
});
