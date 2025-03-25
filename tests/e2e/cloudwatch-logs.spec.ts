import { test, expect } from '@playwright/test';
import { cloudwatch } from '../../playwright/utils/cloudwatch';
import { claude } from '../../playwright/utils/claude';

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
  
  // 2. Use Claude to analyze the log data
  const analysis = await claude.analyze('Identify patterns in these error logs and suggest possible causes', logs);
  console.log('Claude analysis of logs:', analysis);
  
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
  
  // 7. Compare system metrics based on CloudWatch logs
  if (analysis.suggests_system_issue) {
    // Check system metrics on the monitoring dashboard
    const cpuUtilization = await page.locator('.cpu-utilization').textContent();
    const memoryUsage = await page.locator('.memory-usage').textContent();
    
    console.log(`Current CPU: ${cpuUtilization}, Memory: ${memoryUsage}`);
    expect(parseFloat(cpuUtilization)).toBeLessThan(90); // CPU should be under 90%
    expect(parseFloat(memoryUsage)).toBeLessThan(85);    // Memory should be under 85%
  }
  
  // 8. If API errors were detected, navigate to API status page
  if (analysis.api_errors_detected) {
    await page.goto('http://localhost:8080/admin/api-status');
    const apiStatus = await page.locator('.api-status').textContent();
    expect(apiStatus).toContain('Operational');
  }
  
  // Clean up MCP connections
  await cloudwatch.close();
  await claude.close();
});
