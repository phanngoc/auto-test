import { test, expect } from '@playwright/test';
import { db } from '../../playwright/utils/database';
import { claude } from '../../playwright/utils/claude';

test('demonstrate database integration with Playwright MCP', async ({ page }) => {
  // Set longer timeout for MCP initialization
  test.setTimeout(120000);
  
  // 1. Fetch data from the database using MCP
  const orders = await db.query('SELECT * FROM orders WHERE id IN (2885, 2877) LIMIT 2');
  console.log('Orders fetched from database:', orders);
  
  // 2. Use Claude to analyze the order data
  const analysis = await claude.analyze('Identify any potential issues with these orders', orders);
  console.log('Claude analysis:', analysis);
  
  // 3. Use Playwright to navigate to the admin interface
  await page.goto('http://localhost:8080/admin/login');
  
  // 4. Login to the admin panel
  await page.getByRole('textbox', { name: 'ログインID' }).waitFor({ state: 'visible' });
  await page.getByRole('textbox', { name: 'ログインID' }).fill('admin');
  await page.getByRole('textbox', { name: 'パスワード' }).fill('Aa@123456');
  
  // 5. Navigate to orders page
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.getByRole('button', { name: 'ログイン' }).click()
  ]);
  
  await page.goto('http://localhost:8080/admin/order');
  
  // 6. Use order IDs fetched from database to perform actions
  for (const order of orders) {
    const orderId = order.id;
    const checkbox = page.locator(`#check_${orderId}`);
    
    if (await checkbox.isVisible()) {
      await checkbox.check();
      console.log(`Checked order ID: ${orderId}`);
    } else {
      console.log(`Order ID ${orderId} checkbox not found`);
    }
  }
  
  // 7. Complete order preparation if Claude analysis suggests it
  if (!analysis.error && !analysis.has_issues) {
    await page.getByRole('button', { name: '出荷準備完了' }).click();
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.getByText('処理が完了しました')).toBeVisible();
  } else {
    console.log('Skipping order completion due to issues detected in analysis');
  }
  
  // Clean up MCP connections
  await claude.close();
});
