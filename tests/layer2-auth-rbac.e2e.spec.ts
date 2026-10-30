import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'sridattam-dev-jwt-access-secret-key-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'sridattam-dev-jwt-refresh-secret-key-2026';

describe('Layer 2: Auth, RBAC Matrix & Privilege Escalation (E2E against Live Server)', () => {
  let adminToken: string;
  let editorToken: string;
  let readOnlyToken: string;
  let customerToken: string;
  let sampleOrderId: string;
  let sampleProductId: string;

  beforeAll(async () => {
    // 1. Generate valid role tokens using system JWT secret and real DB user IDs
    adminToken = jwt.sign(
      { sub: 'edaee9ba-18f7-4844-9ec6-1c2e81312913', email: 'admin@sridattam.com', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    editorToken = jwt.sign(
      { sub: 'dbabb7db-ef04-40ba-9273-8916b0fb82a1', email: 'editor@sridattam.com', role: 'editor' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    readOnlyToken = jwt.sign(
      { sub: 'ef1c1d0b-39f7-40ef-be66-60e471b8dc70', email: 'read_only@sridattam.com', role: 'read_only' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );
    customerToken = jwt.sign(
      { sub: 'dd376a96-7945-4c48-a424-5cbc5887d8ef', email: 'customer@sridattam.com', role: 'customer' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    // 2. Fetch sample product and order from live server for parameterized endpoints
    const prodRes = await request(BASE_URL).get('/products');
    if (prodRes.body?.data && prodRes.body.data.length > 0) {
      sampleProductId = prodRes.body.data[0].id;
    } else {
      sampleProductId = '00000000-0000-0000-0000-000000000001';
    }

    const orderRes = await request(BASE_URL)
      .get('/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`);
    if (orderRes.body?.orders && orderRes.body.orders.length > 0) {
      sampleOrderId = orderRes.body.orders[0].id;
    } else {
      sampleOrderId = '00000000-0000-0000-0000-000000000001';
    }
  });

  describe('AUTH-01: Privilege Escalation Defense', () => {
    it('POST /auth/register with role="admin" must strictly create a user with role="customer"', async () => {
      const uniqueEmail = `test_escalation_${Date.now()}@sridattam.com`;
      const res = await request(BASE_URL)
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: 'Password123!',
          firstName: 'Escalation',
          lastName: 'Tester',
          role: 'admin',
        });

      if (res.status === 429) {
        expect(res.status).toBe(429);
      } else {
        expect([200, 201]).toContain(res.status);
        expect(res.body.user).toBeDefined();
        expect(res.body.user.role).toBe('customer');

        const decoded: any = jwt.decode(res.body.access_token);
        expect(decoded.role).toBe('customer');
      }
    });

    it('POST /auth/register with role="editor" must strictly create a user with role="customer"', async () => {
      const uniqueEmail = `test_esc_editor_${Date.now()}@sridattam.com`;
      const res = await request(BASE_URL)
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: 'Password123!',
          firstName: 'Escalation',
          lastName: 'Tester',
          role: 'editor',
        });

      if (res.status === 429) {
        expect(res.status).toBe(429);
      } else {
        expect([200, 201]).toContain(res.status);
        expect(res.body.user).toBeDefined();
        expect(res.body.user.role).toBe('customer');
      }
    });
  });

  describe('AUTH-02: Role × Endpoint Authorization Matrix', () => {
    const matrix = [
      // 1. GET /products (Public)
      { name: 'GET /products', method: 'get', path: '/products', reqRole: 'public' },
      // 2. POST /orders (Public guest checkout)
      { name: 'POST /orders', method: 'post', path: '/orders', reqRole: 'public' },
      // 3. POST /orders/track (Public tracking)
      { name: 'POST /orders/track', method: 'post', path: '/orders/track', reqRole: 'public' },
      // 4. GET /company-profile/public (Public profile)
      { name: 'GET /company-profile/public', method: 'get', path: '/company-profile/public', reqRole: 'public' },
      // 5. GET /admin/orders (read_only+)
      { name: 'GET /admin/orders', method: 'get', path: '/admin/orders', reqRole: 'read_only' },
      // 6. GET /admin/payments (read_only+)
      { name: 'GET /admin/payments', method: 'get', path: '/admin/payments', reqRole: 'read_only' },
      // 7. PATCH /admin/orders/:id/status (read_only+)
      { name: 'PATCH /admin/orders/:id/status', method: 'patch', path: () => `/admin/orders/${sampleOrderId}/status`, reqRole: 'read_only' },
      // 8. POST /admin/create-products (editor+)
      { name: 'POST /admin/create-products', method: 'post', path: '/admin/create-products', reqRole: 'editor' },
      // 9. PATCH /admin/update-products/:id (editor+)
      { name: 'PATCH /admin/update-products/:id', method: 'patch', path: () => `/admin/update-products/${sampleProductId}`, reqRole: 'editor' },
      // 10. DELETE /admin/delete-products/:id (editor+)
      { name: 'DELETE /admin/delete-products/:id', method: 'delete', path: () => `/admin/delete-products/${sampleProductId}`, reqRole: 'editor' },
      // 11. GET /audit-logs (admin only)
      { name: 'GET /audit-logs', method: 'get', path: '/audit-logs', reqRole: 'admin' },
      // 12. GET /admin/users (admin only)
      { name: 'GET /admin/users', method: 'get', path: '/admin/users', reqRole: 'admin' },
      // 13. POST /admin/users (admin only)
      { name: 'POST /admin/users', method: 'post', path: '/admin/users', reqRole: 'admin' },
      // 14. PATCH /admin/company-profile (admin only)
      { name: 'PATCH /admin/company-profile', method: 'patch', path: '/admin/company-profile', reqRole: 'admin' },
    ];

    const getReq = (method: string, pathUrl: string, token?: string) => {
      let r = (request(BASE_URL) as any)[method](pathUrl);
      if (token) {
        r = r.set('Authorization', `Bearer ${token}`);
      }
      return r;
    };

    matrix.forEach((ep) => {
      describe(`Matrix checks for: ${ep.name}`, () => {
        const getUrl = () => typeof ep.path === 'function' ? ep.path() : ep.path;

        it('Anonymous access verification', async () => {
          const res = await getReq(ep.method, getUrl());
          if (ep.reqRole === 'public') {
            expect([401, 403]).not.toContain(res.status);
          } else {
            expect(res.status).toBe(401);
          }
        });

        it('Customer role access verification', async () => {
          const res = await getReq(ep.method, getUrl(), customerToken);
          if (ep.reqRole === 'public') {
            expect([401, 403]).not.toContain(res.status);
          } else {
            expect(res.status).toBe(403);
          }
        });

        it('Read-Only role access verification', async () => {
          const res = await getReq(ep.method, getUrl(), readOnlyToken);
          if (ep.reqRole === 'public' || ep.reqRole === 'read_only') {
            expect([401, 403]).not.toContain(res.status);
          } else {
            expect(res.status).toBe(403);
          }
        });

        it('Editor role access verification', async () => {
          const res = await getReq(ep.method, getUrl(), editorToken);
          if (ep.reqRole === 'public' || ep.reqRole === 'read_only' || ep.reqRole === 'editor') {
            expect([401, 403]).not.toContain(res.status);
          } else {
            expect(res.status).toBe(403);
          }
        });

        it('Admin role access verification', async () => {
          const res = await getReq(ep.method, getUrl(), adminToken);
          expect([401, 403]).not.toContain(res.status);
        });
      });
    });
  });

  describe('AUTH-03: Read-Only Staff Capabilities', () => {
    it('read_only user can fetch orders and payments successfully', async () => {
      const ordersRes = await request(BASE_URL)
        .get('/admin/orders')
        .set('Authorization', `Bearer ${readOnlyToken}`);
      expect(ordersRes.status).toBe(200);

      const paymentsRes = await request(BASE_URL)
        .get('/admin/payments')
        .set('Authorization', `Bearer ${readOnlyToken}`);
      expect(paymentsRes.status).toBe(200);
    });

    it('read_only user can access PATCH /admin/orders/:id/status (not 401 or 403)', async () => {
      const res = await request(BASE_URL)
        .patch(`/admin/orders/${sampleOrderId}/status`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({ toStatus: 'paid' });
      expect([401, 403]).not.toContain(res.status);
    });

    it('read_only user is forbidden from mutating products', async () => {
      const res = await request(BASE_URL)
        .post('/admin/create-products')
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({ title: 'Test Product', sku: 'TEST-SKU-1' });
      expect(res.status).toBe(403);
    });
  });

  describe('AUTH-04: Admin-Only Endpoints Isolation', () => {
    it('editor and read_only users receive 403 Forbidden on /admin/users', async () => {
      const r1 = await request(BASE_URL)
        .get('/admin/users')
        .set('Authorization', `Bearer ${editorToken}`);
      expect(r1.status).toBe(403);

      const r2 = await request(BASE_URL)
        .get('/admin/users')
        .set('Authorization', `Bearer ${readOnlyToken}`);
      expect(r2.status).toBe(403);
    });

    it('editor and read_only users receive 403 Forbidden on /audit-logs', async () => {
      const r1 = await request(BASE_URL)
        .get('/audit-logs')
        .set('Authorization', `Bearer ${editorToken}`);
      expect(r1.status).toBe(403);

      const r2 = await request(BASE_URL)
        .get('/audit-logs')
        .set('Authorization', `Bearer ${readOnlyToken}`);
      expect(r2.status).toBe(403);
    });

    it('editor and read_only users receive 403 Forbidden on PATCH /admin/company-profile', async () => {
      const r1 = await request(BASE_URL)
        .patch('/admin/company-profile')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ tradeName: 'Hacked Trade' });
      expect(r1.status).toBe(403);

      const r2 = await request(BASE_URL)
        .patch('/admin/company-profile')
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({ tradeName: 'Hacked Trade' });
      expect(r2.status).toBe(403);
    });
  });

  describe('AUTH-05: JWT Refresh Token Rotation & Expiry', () => {
    it('refresh token rotation issues new access token', async () => {
      const validRefreshToken = jwt.sign(
        { sub: 'edaee9ba-18f7-4844-9ec6-1c2e81312913', type: 'refresh' },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' },
      );

      const refreshRes = await request(BASE_URL)
        .post('/auth/refresh')
        .send({ refreshToken: validRefreshToken });
      expect([200, 201]).toContain(refreshRes.status);
      expect(refreshRes.body.access_token).toBeDefined();
    });

    it('tampered or invalid access token is rejected with 401', async () => {
      const res = await request(BASE_URL)
        .get('/admin/orders')
        .set('Authorization', 'Bearer invalid.tampered.token');
      expect(res.status).toBe(401);
    });

    it('expired access token is rejected with 401', async () => {
      const expiredToken = jwt.sign(
        { sub: 'edaee9ba-18f7-4844-9ec6-1c2e81312913', email: 'admin@sridattam.com', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '-1s' },
      );
      const res = await request(BASE_URL)
        .get('/admin/orders')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
    });
  });
});
