import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {

    await page.goto('http://localhost:8080/admin/login');
    await page.getByRole('textbox', { name: 'ログインID' }).click();
    await page.getByRole('textbox', { name: 'ログインID' }).fill('admin');
    await page.getByRole('textbox', { name: 'ログインID' }).press('Tab');
    await page.getByRole('textbox', { name: 'パスワード' }).fill('Aa@123456');
    await page.getByRole('textbox', { name: 'パスワード' }).press('Enter');
    // sleep 2s and wait for the page to load
    await page.waitForTimeout(2000);
    await page.goto('http://localhost:8080/admin/customer/stamp');

    await page.getByRole('button', { name: '検索' }).click();

    await page.getByText('スタンプ個別付与').click();
    await page.locator('#form_create_stamp div').filter({ hasText: '店舗 選択してください 長住店 Select1' }).nth(1).click();

    await page.locator('#customer_id').click();
    await page.locator('#customer_id').press('ControlOrMeta+a');
    await page.locator('#customer_id').fill('2800040000385');
    await page.getByRole('link', { name: '会員詳細を確認' }).click();

    await page.getByLabel('スタンプ種別', { exact: true }).selectOption('6');
    await page.getByLabel('店舗', { exact: true }).selectOption('0125');
    
    await page.getByRole('button', { name: '実行' }).click();

    await page.waitForTimeout(3000);
    await expect(page.getByRole('link', { name: '2800040000385' })).toBeVisible();


});