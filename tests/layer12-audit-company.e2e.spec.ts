import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const BASE_URL = 'http://localhost:5000';
const JWT_SECRET = process.env.JWT_SECRET || 'sridattam-dev-jwt-access-secret-key-2026';

describe('Layer 12: Audit Logs & Company Profile (Live Server E2E)', () => {
  let adminToken: string;
  let editorToken: string;
  let readOnlyToken: string;
  let cleanProfile: any;

  beforeAll(async () => {
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

    // Fetch initial profile to restore after tests
    const getRes = await request(BASE_URL)
      .get('/admin/company-profile')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(getRes.status).toBe(200);
    const { id, createdAt, updatedAt, ...dtoOnly } = getRes.body;
    cleanProfile = dtoOnly;
  });

  afterAll(async () => {
    // Restore initial profile if needed
    if (cleanProfile) {
      await request(BASE_URL)
        .patch('/admin/company-profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(cleanProfile);
    }
  });

  // ==========================================
  // AUD-01: Append-Only Logs & Strict RBAC
  // ==========================================
  describe('AUD-01: Append-Only Logs & Strict RBAC', () => {
    it('AUD-01.1: prevents modification or deletion routes on audit logs (returns 404)', async () => {
      // POST route does not exist
      const postRes = await request(BASE_URL)
        .post('/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ actionType: 'FAKE_LOG' });
      expect(postRes.status).toBe(404);

      // PATCH route does not exist
      const patchRes = await request(BASE_URL)
        .patch('/audit-logs/audit_12345')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ actionType: 'MODIFIED_LOG' });
      expect(patchRes.status).toBe(404);

      // DELETE route does not exist
      const delRes = await request(BASE_URL)
        .delete('/audit-logs/audit_12345')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(delRes.status).toBe(404);
    });

    it('AUD-01.2: enforces strict admin-only access to view audit logs (blocks editor, read_only, and anonymous)', async () => {
      // Anonymous request rejected
      const anonRes = await request(BASE_URL).get('/audit-logs');
      expect(anonRes.status).toBe(401);

      // Editor request rejected (403 Forbidden)
      const editRes = await request(BASE_URL)
        .get('/audit-logs')
        .set('Authorization', `Bearer ${editorToken}`);
      expect(editRes.status).toBe(403);

      // Read-only request rejected (403 Forbidden)
      const roRes = await request(BASE_URL)
        .get('/audit-logs')
        .set('Authorization', `Bearer ${readOnlyToken}`);
      expect(roRes.status).toBe(403);

      // Admin request permitted (200 OK)
      const adminRes = await request(BASE_URL)
        .get('/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(Array.isArray(adminRes.body)).toBe(true);
    });
  });

  // ==========================================
  // AUD-02: Mutation Snapshots (beforeValue & afterValue)
  // ==========================================
  describe('AUD-02: Mutation Snapshots in AuditLog', () => {
    it('AUD-02: records beforeValue and afterValue snapshots when mutating critical entities', async () => {
      const updatedTradeName = `Sridattam Vedic Heritage ${Date.now()}`;

      // Update company profile
      const patchRes = await request(BASE_URL)
        .patch('/admin/company-profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...cleanProfile,
          tradeName: updatedTradeName,
        });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.tradeName).toBe(updatedTradeName);

      // Query audit logs for company_profile entity
      const auditRes = await request(BASE_URL)
        .get('/audit-logs?entityType=company_profile')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(auditRes.status).toBe(200);
      expect(Array.isArray(auditRes.body)).toBe(true);

      const log = auditRes.body.find(
        (l: any) => l.actionType === 'COMPANY_PROFILE_UPDATE',
      );
      expect(log).toBeDefined();
      expect(log.userRole).toBe('admin');
      expect(log.entityType).toBe('company_profile');

      // Verify beforeValue and afterValue snapshots
      expect(log.beforeValue).toBeDefined();
      expect(log.afterValue).toBeDefined();
      expect(log.afterValue.tradeName).toBe(updatedTradeName);
    });
  });

  // ==========================================
  // COMP-01: Bank Account Data Privacy
  // ==========================================
  describe('COMP-01: Bank Account Security on Public Endpoint', () => {
    it('COMP-01: public endpoint GET /company-profile/public exposes business details but NEVER returns accountNumber or signatureUrl', async () => {
      // 1. Fetch public profile (no auth required)
      const pubRes = await request(BASE_URL).get('/company-profile/public');
      expect(pubRes.status).toBe(200);
      const pubData = pubRes.body;

      // Essential trade details are present
      expect(pubData.legalName).toBeDefined();
      expect(pubData.gstin).toBeDefined();
      expect(pubData.pan).toBeDefined();

      // Confidential financial / signatory credentials must NEVER be exposed publicly
      expect(pubData.accountNumber).toBeUndefined();
      expect(pubData.signatureUrl).toBeUndefined();
      expect(pubData.cin).toBeUndefined();

      // 2. Fetch admin profile (auth required): verify accountNumber is available to admin
      const adminRes = await request(BASE_URL)
        .get('/admin/company-profile')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.accountNumber).toBeDefined();
      expect(adminRes.body.accountNumber).toBe(cleanProfile.accountNumber);
    });
  });

  // ==========================================
  // COMP-02: Cache Invalidation on Update
  // ==========================================
  describe('COMP-02: Cache Invalidation on Company Profile Update', () => {
    it('COMP-02: editing company profile immediately invalidates Redis cache and updates public endpoint', async () => {
      // 1. Warm public cache
      const warmRes = await request(BASE_URL).get('/company-profile/public');
      expect(warmRes.status).toBe(200);

      // 2. Update trade name via admin endpoint
      const newTradeName = `Cache Invalidation Brand ${Date.now()}`;
      const updateRes = await request(BASE_URL)
        .patch('/admin/company-profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...cleanProfile,
          tradeName: newTradeName,
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.tradeName).toBe(newTradeName);

      // 3. Immediately fetch public endpoint: must reflect updated tradeName (verifying cache invalidation)
      const publicAfterUpdate = await request(BASE_URL).get('/company-profile/public');
      expect(publicAfterUpdate.status).toBe(200);
      expect(publicAfterUpdate.body.tradeName).toBe(newTradeName);
    });
  });
});
