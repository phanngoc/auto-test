# Playwright Automation Project

This project is set up for automation testing using Playwright.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Run tests:

```bash
npx playwright test --ui tests/e2e/admin-stamp.spec.ts
```

Có 2 mode là chạy headless và chạy có UI. Để chạy có UI thì thêm option `--ui` vào sau lệnh `npx playwright test`.

## Generate Test Scripts

You can use Playwright's codegen tool to automatically generate test scripts by recording your interactions with a web application:

```bash
npx playwright codegen http://localhost:8080/admin/login
```

This will open a browser window where you can interact with the website, and Playwright will generate the corresponding test code.
