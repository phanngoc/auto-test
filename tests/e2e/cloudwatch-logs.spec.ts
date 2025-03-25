import { test, expect } from '@playwright/test';
import { cloudwatch } from '../../playwright/utils/cloudwatch';

test('demonstrate CloudWatch logs integration with Playwright MCP', async ({ page }) => {
  // Set longer timeout for MCP initialization and AWS API calls
  test.setTimeout(120000);
  
  // Define the timeframe for log queries (last 2 hours)
  const endTime = Date.now();
  const startTime = endTime - (2 * 60 * 60 * 1000);
  
  // 1. Query CloudWatch logs for errors
  const logs = await cloudwatch.queryLogs(
    'my-application-logs',
    'error',
    startTime,
    endTime,
    50
  );
  console.log(`Found ${logs.length} error logs in the past 2 hours`);
  

  
  // 3. Use Playwright to navigate to the admin interface
  await page.goto('http://localhost:8080/admin/login');
  
  // 4. Login to the admin panel
  await page.getByRole('textbox', { name: 'ログインID' }).waitFor({ state: 'visible' });
  await page.getByRole('textbox', { name: 'ログインID' }).fill('admin');
  await page.getByRole('textbox', { name: 'パスワード' }).fill('Aa@123456');
  
  // 5. Navigate to system monitoring page
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.getByRole('button', { name: 'ログイン' }).click()
  ]);
  
  await page.goto('http://localhost:8080/admin/monitoring');
  
  // 6. Take screenshot of the monitoring dashboard
  await page.screenshot({ path: 'monitoring-dashboard.png' });
  

  console.log('Screenshot of the monitoring dashboard taken.');


  // Clean up MCP connections
  await cloudwatch.close();
});
