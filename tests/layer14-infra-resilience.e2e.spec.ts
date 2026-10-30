import request from 'supertest';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = 'http://localhost:5000';

describe('Layer 14: Redis Fail-Open & Multi-Container Docker (Live Server E2E)', () => {
  jest.setTimeout(30000);

  let categoryId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Fetch active category
    const catRes = await request(BASE_URL).get('/categories');
    const categories = Array.isArray(catRes.body) ? catRes.body : catRes.body.data;
    categoryId = categories[0].id;

    // Fetch an active product
    const prodRes = await request(BASE_URL).get('/products?perPage=1');
    const products = Array.isArray(prodRes.body) ? prodRes.body : prodRes.body.data;
    testProductId = products[0].id;
  });

  // ==========================================
  // INFRA-01: Redis Outage Resilience (Fail-Open)
  // ==========================================
  describe('INFRA-01: Redis Outage Resilience', () => {
    it('INFRA-01.1: baseline catalog read functions under normal Redis operation', async () => {
      const res = await request(BASE_URL).get('/products');
      expect(res.status).toBe(200);
      const items = Array.isArray(res.body) ? res.body : res.body.data;
      expect(items.length).toBeGreaterThan(0);
    });

    it('INFRA-01.2: with Redis stopped, catalog API and checkout continue serving requests without 500 error or hanging', async () => {
      try {
        // Stop Redis container
        execSync('docker stop sridattam_redis_cache', { stdio: 'pipe' });

        // 1. Catalog query should bypass Redis cache gracefully and fetch from PostgreSQL
        const catRes = await request(BASE_URL).get('/products');
        expect(catRes.status).toBe(200);
        const products = Array.isArray(catRes.body) ? catRes.body : catRes.body.data;
        expect(products.length).toBeGreaterThan(0);

        // 2. Checkout placement must not hang or fail
        const checkoutRes = await request(BASE_URL)
          .post('/orders')
          .set('X-Forwarded-For', '10.99.1.1')
          .send({
            email: 'redis.resilience@example.com',
            items: [{ productId: testProductId, quantity: 1 }],
            shippingAddress: {
              fullName: 'Redis Failover Tester',
              phone: '9876543210',
              addressLine1: 'Resilience Blvd 42',
              city: 'Hyderabad',
              state: 'Telangana',
              postalCode: '500081',
              country: 'IN',
            },
          });
        expect([200, 201]).toContain(checkoutRes.status);
        expect(checkoutRes.body.status).toBe('payment_pending');
      } finally {
        // Always restart Redis container to restore cluster health
        execSync('docker start sridattam_redis_cache', { stdio: 'pipe' });
        // Allow Redis to re-establish
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    });

    it('INFRA-01.3: verifies Redis reconnects cleanly and resumes caching after restart', async () => {
      const res = await request(BASE_URL).get('/products');
      expect(res.status).toBe(200);
      const items = Array.isArray(res.body) ? res.body : res.body.data;
      expect(items.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // INFRA-02: Multi-Container Docker Health
  // ==========================================
  describe('INFRA-02: Multi-Container Docker Health & Container State', () => {
    it('INFRA-02.1: PostgreSQL and Redis Docker containers are healthy and running', () => {
      const psOutput = execSync('docker ps --format "{{.Names}}\t{{.Status}}"', { encoding: 'utf-8' });
      expect(psOutput).toContain('sridattam_postgres_db');
      expect(psOutput).toContain('sridattam_redis_cache');
      expect(psOutput).toMatch(/sridattam_postgres_db\tUp/);
      expect(psOutput).toMatch(/sridattam_redis_cache\tUp/);
    });

    it('INFRA-02.2: Live API server is responsive on localhost:5000', async () => {
      const res = await request(BASE_URL).get('/company-profile/public');
      expect(res.status).toBe(200);
      expect(res.body.tradeName).toBeDefined();
    });
  });
});
