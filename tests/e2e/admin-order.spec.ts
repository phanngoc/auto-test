import { test, expect } from '@playwright/test';

// Kiểm thử trang đăng nhập admin
test('đăng nhập và xử lý đơn hàng', async ({ page }) => {
  // Đặt timeout dài hơn nếu trang tải chậm
  test.setTimeout(60000);
  
  // Mở trang đăng nhập
  await page.goto('http://localhost:8080/admin/login');
  
  // Đăng nhập
  await page.getByRole('textbox', { name: 'ログインID' }).waitFor({ state: 'visible' });
  await page.getByRole('textbox', { name: 'ログインID' }).click();
  await page.getByRole('textbox', { name: 'ログインID' }).fill('admin');
  await page.getByRole('textbox', { name: 'ログインID' }).press('Tab');
  
  await page.getByRole('textbox', { name: 'パスワード' }).fill('Aa@123456');
  
  // Sử dụng promise.all để đợi chuyển hướng sau khi nhấn nút đăng nhập
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.getByRole('button', { name: 'ログイン' }).click()
  ]);
  
  // Đảm bảo trang đã tải hoàn toàn trước khi tìm kiếm
  await page.waitForLoadState('networkidle');
  
  // goto page admin/order
  await page.goto('http://localhost:8080/admin/order');
  // Nhấn nút tìm kiếm
  await page.getByRole('button', { name: '検索' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '検索' }).click();
  
  // Đợi kết quả tìm kiếm hiển thị
  await page.waitForLoadState('networkidle');
  
  // Chọn các checkbox
  await page.locator('#check_2885').waitFor({ state: 'visible' });
  await page.locator('#check_2885').check();
  
  await page.locator('#check_2877').waitFor({ state: 'visible' });
  await page.locator('#check_2877').check();
  
  // Nhấn nút hoàn tất chuẩn bị đơn hàng
  await page.getByRole('button', { name: '出荷準備完了' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: '出荷準備完了' }).click();
  
  // Xác nhận thao tác
  await page.getByRole('button', { name: 'OK' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'OK' }).click();
  
  // Đợi kết quả hiển thị và kiểm tra
  await page.getByText('失敗/対象外 ：2件').waitFor({ state: 'visible' });
  await expect(page.getByText('失敗/対象外 ：2件')).toBeVisible();
});