import { test, expect } from '@playwright/test';
import { rds } from '../../playwright/utils/rds';

test('demonstrate AWS RDS integration with Playwright MCP', async ({ page }) => {
  // Set longer timeout for MCP initialization and AWS API calls
  test.setTimeout(120000);
  
  // 1. Connect to PostgreSQL RDS database
  const pgConnection = await rds.connectToPostgres({
    host: process.env.RDS_PG_HOST,
    port: process.env.RDS_PG_PORT || 5432,
    user: process.env.RDS_PG_USER,
    password: process.env.RDS_PG_PASSWORD,
    database: process.env.RDS_PG_DATABASE,
    ssl: true
  });
  console.log('Connected to PostgreSQL RDS:', pgConnection.connectionId);
  
  // 2. Query product data from the database
  const products = await rds.query(
    pgConnection.connectionId,
    'SELECT * FROM products WHERE price > $1 AND active = $2 ORDER BY price DESC LIMIT 10',
    [100, true]
  );
  console.log(`Found ${products.length} premium products`);
  
  // 4. Use Playwright to navigate to the admin interface
  await page.goto('http://localhost:8080/admin/login');
  
  // 5. Login to the admin panel
  await page.getByRole('textbox', { name: 'ログインID' }).waitFor({ state: 'visible' });
  await page.getByRole('textbox', { name: 'ログインID' }).fill('admin');
  await page.getByRole('textbox', { name: 'パスワード' }).fill('Aa@123456');
  
  // 6. Navigate to products page
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.getByRole('button', { name: 'ログイン' }).click()
  ]);
  
  await page.goto('http://localhost:8080/admin/products');
  
  // 7. Update product descriptions based on Claude analysis
  if (analysis.suggestions && analysis.suggestions.length > 0) {
    // Just demonstrate updating the first product
    if (products.length > 0) {
      const productId = products[0].id;
      
      // Find the product by ID
      await page.fill('#search_id', productId.toString());
      await page.click('#search_button');
      await page.waitForSelector(`#product_${productId}`);
      
      // Edit the product
      await page.click(`#edit_${productId}`);
      
      // Update description with Claude's suggestion
      await page.fill('#product_description', 
        `${products[0].description}\n\nMarketing suggestion: ${analysis.suggestions[0]}`);
      
      // Save changes
      await page.click('#save_button');
      await expect(page.locator('#success_message')).toBeVisible();
    }
  }
  
  // 8. Close connections and clean up
  await rds.closeConnection(pgConnection.connectionId);
  await rds.close();
});
