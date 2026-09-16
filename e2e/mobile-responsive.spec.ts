import { test, expect } from '@playwright/test';

test.describe('Mobile Responsive Layout Tests', () => {
  test.describe('Mobile Viewport', () => {
    test.beforeEach(({ isMobile }) => {
      if (!isMobile) test.skip();
    });

    test('should show mobile top bar and hide desktop sidebar', async ({ page }) => {
      await page.goto('/');

      const mobileHeader = page.locator('header.md\\:hidden');
      const desktopSidebar = page.locator('aside.md\\:flex');

      await expect(mobileHeader).toBeVisible();
      await expect(desktopSidebar).toBeHidden();
    });

    test('should open drawer on hamburger click and close on navigation', async ({ page }) => {
      await page.goto('/');

      const menuBtn = page.getByRole('button', { name: 'Open navigation menu' });
      await expect(menuBtn).toBeVisible();

      // Click to open
      await menuBtn.click();
      
      const closeBtn = page.getByRole('button', { name: 'Close navigation drawer' });
      await expect(closeBtn).toBeVisible();

      const drawerNav = page.locator('header .fixed.inset-y-0.left-0'); // The drawer container
      await expect(drawerNav).toHaveClass(/.*translate-x-0.*/);

      // Click a nav link
      const modsLink = page.getByRole('link', { name: 'Mods Manager' });
      await modsLink.click();

      // Drawer should auto-close and page navigate
      await expect(drawerNav).toHaveClass(/.*-translate-x-full.*/);
      await expect(page).toHaveURL(/.*\/mods/);
    });

    test('should auto-close drawer on ESC key', async ({ page }) => {
      await page.goto('/');

      const menuBtn = page.getByRole('button', { name: 'Open navigation menu' });
      await menuBtn.click();

      const drawerNav = page.locator('header .fixed.inset-y-0.left-0');
      await expect(drawerNav).toHaveClass(/.*translate-x-0.*/);

      await page.keyboard.press('Escape');
      await expect(drawerNav).toHaveClass(/.*-translate-x-full.*/);
    });

    test('should navigate correctly on mobile', async ({ page }) => {
      await page.goto('/');
      
      const menuBtn = page.getByRole('button', { name: 'Open navigation menu' });

      // Navigate to Sandbox
      await menuBtn.click();
      await page.getByRole('link', { name: 'Sandbox Settings' }).click();
      await expect(page).toHaveURL(/.*\/sandbox/);

      // Navigate to Settings
      await menuBtn.click();
      await page.getByRole('link', { name: 'Server Properties' }).click();
      await expect(page).toHaveURL(/.*\/settings/);

      // Navigate to Players
      await menuBtn.click();
      await page.getByRole('link', { name: 'Players & Moderation' }).click();
      await expect(page).toHaveURL(/.*\/players/);
    });
  });

  test.describe('Desktop Viewport', () => {
    test.beforeEach(({ isMobile }) => {
      if (isMobile) test.skip();
    });
    
    test.use({ viewport: { width: 1280, height: 720 } });

    test('should show desktop sidebar and hide mobile top bar', async ({ page }) => {
      await page.goto('/');

      const mobileHeader = page.locator('header.md\\:hidden');
      const desktopSidebar = page.locator('aside.md\\:flex');

      // Given a desktop viewport, the mobile header should be hidden or not visible
      // Note: md:hidden usually hides it via display: none on min-width 768px
      await expect(mobileHeader).toBeHidden();
      await expect(desktopSidebar).toBeVisible();
    });
  });
});
