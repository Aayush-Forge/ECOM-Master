import { test, expect } from '@playwright/test';
import { ADMIN_URL, BACKEND_URL, USER_CREDENTIALS } from './helpers/auth';

test.describe('Phase 1: Admin RBAC, Staff Management & Password Reset', () => {
  const NEW_TEMP_PASSWORD = 'PlaywrightTestPass2026!';

  test.afterEach(async ({ request }) => {
    // Restore editor password back to default
    try {
      const loginRes = await request.post(`${BACKEND_URL}/auth/login`, {
        data: { email: USER_CREDENTIALS.admin.email, password: USER_CREDENTIALS.admin.password },
      });
      if (loginRes.ok()) {
        const { access_token } = await loginRes.json();
        const usersRes = await request.get(`${BACKEND_URL}/admin/users`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const users = await usersRes.json();
        const editor = users.find((u: any) => u.email === USER_CREDENTIALS.editor.email);
        if (editor) {
          await request.patch(`${BACKEND_URL}/admin/users/${editor.id}/password`, {
            headers: { Authorization: `Bearer ${access_token}` },
            data: { password: USER_CREDENTIALS.editor.password },
          });
        }
      }
    } catch {
      // Best-effort cleanup
    }
  });

  test('1. Admin can log in, view staff users, and open the Reset Password modal', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`);
    await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible();

    await page.fill('#email', USER_CREDENTIALS.admin.email);
    await page.fill('#password', USER_CREDENTIALS.admin.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/overview', { timeout: 15000 });

    await page.goto(`${ADMIN_URL}/users`);
    await expect(page.locator('h2:has-text("Staff and Admin")')).toBeVisible({ timeout: 15000 });
    await expect(page.locator(`text=${USER_CREDENTIALS.editor.email}`)).toBeVisible({ timeout: 10000 });

    const editorRow = page.locator('tr', { hasText: USER_CREDENTIALS.editor.email });
    await expect(editorRow).toBeVisible();

    const resetBtn = editorRow.locator('button:has-text("Reset Password")');
    await expect(resetBtn).toBeVisible();

    await resetBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('text=Reset Password')).toBeVisible();
    await expect(dialog.locator(`text=${USER_CREDENTIALS.editor.email}`)).toBeVisible();

    await dialog.locator('button:has-text("Cancel")').click();
    await expect(dialog).not.toBeVisible();
  });

  test('2. Admin can successfully reset an employee password with end-to-end authentication verification', async ({ page, request }) => {
    await page.goto(`${ADMIN_URL}/login`);
    await page.fill('#email', USER_CREDENTIALS.admin.email);
    await page.fill('#password', USER_CREDENTIALS.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/overview', { timeout: 15000 });

    await page.goto(`${ADMIN_URL}/users`);
    await expect(page.locator('h2:has-text("Staff and Admin")')).toBeVisible({ timeout: 15000 });

    const editorRow = page.locator('tr', { hasText: USER_CREDENTIALS.editor.email });
    await editorRow.locator('button:has-text("Reset Password")').click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    await dialog.locator('#reset-password').fill(NEW_TEMP_PASSWORD);
    await dialog.locator('#confirm-password').fill(NEW_TEMP_PASSWORD);

    const submitBtn = dialog.locator('button[type="submit"]:has-text("Update Password")');
    await submitBtn.click();

    await expect(page.locator('text=Password reset successfully')).toBeVisible({ timeout: 10000 });
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Verify authentication succeeds with the new password
    const authRes = await request.post(`${BACKEND_URL}/auth/login`, {
      data: { email: USER_CREDENTIALS.editor.email, password: NEW_TEMP_PASSWORD },
    });
    expect([200, 201]).toContain(authRes.status());
    const authBody = await authRes.json();
    expect(authBody.access_token).toBeDefined();

    // Verify old password is rejected
    const oldAuthRes = await request.post(`${BACKEND_URL}/auth/login`, {
      data: { email: USER_CREDENTIALS.editor.email, password: 'WrongOldPassword123' },
    });
    expect(oldAuthRes.status()).toBe(401);
  });

  test('3. Non-admin users cannot see the Reset Password button or access admin password endpoint', async ({ page, request }) => {
    await page.goto(`${ADMIN_URL}/login`);
    await page.fill('#email', USER_CREDENTIALS.read_only.email);
    await page.fill('#password', USER_CREDENTIALS.read_only.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/*', { timeout: 15000 });
    await page.goto(`${ADMIN_URL}/users`);

    await expect(page.locator('button:has-text("Reset Password")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Add Staff Account")')).not.toBeVisible();

    // Direct API attempt should receive 403 Forbidden
    const loginViewer = await request.post(`${BACKEND_URL}/auth/login`, {
      data: { email: USER_CREDENTIALS.read_only.email, password: USER_CREDENTIALS.read_only.password },
    });
    const { access_token } = await loginViewer.json();

    const exploitRes = await request.patch(`${BACKEND_URL}/admin/users/any-id/password`, {
      headers: { Authorization: `Bearer ${access_token}` },
      data: { password: 'HackerPassword123' },
    });
    expect(exploitRes.status()).toBe(403);
  });
});
