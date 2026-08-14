/**
 * Addresses API client — mock implementation.
 *
 * Replace the mock returns with real fetch() calls when the
 * NestJS backend address endpoints are ready.
 */

let MOCK_ADDRESSES = [
  {
    id: 'addr_001',
    label: 'Home',
    name: 'Aayush Sharma',
    line1: '42, Lotus Apartments',
    line2: 'Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
    phone: '+91 98765 43210',
    isDefault: true,
  },
  {
    id: 'addr_002',
    label: 'Office',
    name: 'Aayush Sharma',
    line1: '5th Floor, TechPark One',
    line2: 'Hinjewadi Phase 1',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411057',
    phone: '+91 98765 43210',
    isDefault: false,
  },
  {
    id: 'addr_003',
    label: 'Parents',
    name: 'Rajesh Sharma',
    line1: '12, Civil Lines',
    line2: 'Near Statue Circle',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302001',
    phone: '+91 94140 12345',
    isDefault: false,
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getAddressesSync() {
  return [...MOCK_ADDRESSES];
}

/** Get all saved addresses for the current user. */
export async function getAddresses() {
  return getAddressesSync();
}

/** Add a new address. */
export async function addAddress(data) {
  // return fetch('/api/account/addresses', { method: 'POST', body: JSON.stringify(data) }).then(r => r.json());
  const newAddr = {
    id: `addr_${String(MOCK_ADDRESSES.length + 1).padStart(3, '0')}`,
    ...data,
    isDefault: MOCK_ADDRESSES.length === 0,
  };
  MOCK_ADDRESSES.push(newAddr);
  return newAddr;
}

/** Update an existing address. */
export async function updateAddress(id, data) {
  // return fetch(`/api/account/addresses/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then(r => r.json());
  const idx = MOCK_ADDRESSES.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  MOCK_ADDRESSES[idx] = { ...MOCK_ADDRESSES[idx], ...data };
  return MOCK_ADDRESSES[idx];
}

/** Delete an address. */
export async function deleteAddress(id) {
  // return fetch(`/api/account/addresses/${id}`, { method: 'DELETE' }).then(r => r.json());
  const idx = MOCK_ADDRESSES.findIndex((a) => a.id === id);
  if (idx === -1) return { success: false };
  MOCK_ADDRESSES.splice(idx, 1);
  return { success: true };
}

/** Set an address as the default (unsets all others). */
export async function setDefaultAddress(id) {
  // return fetch(`/api/account/addresses/${id}/default`, { method: 'PATCH' }).then(r => r.json());
  const addr = MOCK_ADDRESSES.find((a) => a.id === id);
  if (!addr) return { success: false };
  MOCK_ADDRESSES.forEach((a) => { a.isDefault = a.id === id; });
  return { success: true, address: addr };
}
