import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'sridattam-dev-jwt-access-secret-key-2026';

describe('Layer 5: Categories & Taxonomy Hierarchy (Live Server E2E)', () => {
  let editorToken: string;
  let readOnlyToken: string;
  let seededCategoryId: string;

  beforeAll(async () => {
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

    // Fetch existing categories to find one with attached products
    const catRes = await request(BASE_URL).get('/categories');
    expect(catRes.status).toBe(200);
    const categories = Array.isArray(catRes.body) ? catRes.body : catRes.body.data;
    expect(categories.length).toBeGreaterThan(0);
    seededCategoryId = categories[0].id;
  });

  describe('CAT-01: Multi-Node Cycle Prevention', () => {
    it('detects and rejects circular parent relationships (A -> B -> A) with 400 Bad Request', async () => {
      // 1. Create Category A
      const slugA = `cat-a-${Date.now()}`;
      const resA = await request(BASE_URL)
        .post('/admin/create-categories')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: 'Cycle Category A', slug: slugA });
      expect([200, 201]).toContain(resA.status);
      const catAId = resA.body.id;

      // 2. Create Category B with Parent = A
      const slugB = `cat-b-${Date.now()}`;
      const resB = await request(BASE_URL)
        .post('/admin/create-categories')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: 'Cycle Category B', slug: slugB, parentId: catAId });
      expect([200, 201]).toContain(resB.status);
      const catBId = resB.body.id;

      // 3. Attempt to update Category A with Parent = B (Creating circular loop A -> B -> A)
      const resCycle = await request(BASE_URL)
        .patch(`/admin/update-categories/${catAId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ parentId: catBId });

      expect(resCycle.status).toBe(400);
      expect(resCycle.body.message).toMatch(/circular category parent relationship/i);

      // Clean up test categories
      await request(BASE_URL)
        .delete(`/admin/delete-categories/${catBId}`)
        .set('Authorization', `Bearer ${editorToken}`);
      await request(BASE_URL)
        .delete(`/admin/delete-categories/${catAId}`)
        .set('Authorization', `Bearer ${editorToken}`);
    });
  });

  describe('CAT-02: Immediate Self-Parenting', () => {
    it('rejects setting a category as its own parent with 400 Bad Request', async () => {
      // 1. Create Category C
      const slugC = `cat-self-${Date.now()}`;
      const resC = await request(BASE_URL)
        .post('/admin/create-categories')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: 'Self Category C', slug: slugC });
      expect([200, 201]).toContain(resC.status);
      const catCId = resC.body.id;

      // 2. Attempt self-parenting: update Category C parentId to Category C.id
      const resSelf = await request(BASE_URL)
        .patch(`/admin/update-categories/${catCId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ parentId: catCId });

      expect(resSelf.status).toBe(400);
      expect(resSelf.body.message).toMatch(/cannot be its own parent/i);

      // Clean up
      await request(BASE_URL)
        .delete(`/admin/delete-categories/${catCId}`)
        .set('Authorization', `Bearer ${editorToken}`);
    });
  });

  describe('CAT-03: Foreign Key Guard Integrity', () => {
    it('rejects deleting a category with associated products with 409 Conflict', async () => {
      // Attempt to delete seeded category with products
      const res = await request(BASE_URL)
        .delete(`/admin/delete-categories/${seededCategoryId}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/cannot delete category with associated products/i);
    });

    it('allows clean deletion of an empty standalone category with 200 OK', async () => {
      // Create empty category
      const slugEmpty = `cat-empty-${Date.now()}`;
      const resCreate = await request(BASE_URL)
        .post('/admin/create-categories')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: 'Empty Deletable Category', slug: slugEmpty });
      expect([200, 201]).toContain(resCreate.status);
      const emptyCatId = resCreate.body.id;

      // Delete it
      const resDelete = await request(BASE_URL)
        .delete(`/admin/delete-categories/${emptyCatId}`)
        .set('Authorization', `Bearer ${editorToken}`);

      expect(resDelete.status).toBe(200);
    });
  });

  describe('CAT-04: Public vs Admin Endpoints', () => {
    it('unauthenticated GET /categories returns 200 OK with active categories', async () => {
      const res = await request(BASE_URL).get('/categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body) || Array.isArray(res.body.data)).toBe(true);
    });

    it('unauthenticated GET /admin/all-categories returns 401 Unauthorized', async () => {
      const res = await request(BASE_URL).get('/admin/all-categories');
      expect(res.status).toBe(401);
    });

    it('read_only staff GET /admin/all-categories returns 200 OK', async () => {
      const res = await request(BASE_URL)
        .get('/admin/all-categories')
        .set('Authorization', `Bearer ${readOnlyToken}`);
      expect(res.status).toBe(200);
    });
  });
});
