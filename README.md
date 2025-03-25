# Playwright Automation Project

This project is set up for automation testing using Playwright.

## Setup

1. Install dependencies:
    ```bash
    npm install
    ```

2. Run tests:
    ```bash
    npm test
    ```

## Generate Test Scripts

You can use Playwright's codegen tool to automatically generate test scripts by recording your interactions with a web application:

```bash
npx playwright codegen {url}
```

This will open a browser window where you can interact with the website, and Playwright will generate the corresponding test code.

## Database Integration

This project supports reading data from databases to use in automated tests:

1. Configure your database connection in `.env` file:
    ```
    DB_HOST=localhost
    DB_PORT=5432
    DB_USER=username
    DB_PASSWORD=password
    DB_NAME=database
    ```

2. Use the database utility in your tests:
    ```typescript
    import { db } from '../../playwright/utils/database';
    
    test('test with database data', async ({ page }) => {
      const users = await db.query('SELECT * FROM users LIMIT 10');
      // Use the data in your test
    });
    ```

## AWS RDS Integration

The project supports direct integration with AWS RDS databases:

1. Configure your RDS settings in `.env` file:
    ```
    AWS_REGION=us-east-1
    AWS_ACCESS_KEY_ID=your_access_key
    AWS_SECRET_ACCESS_KEY=your_secret_key
    RDS_SSL=true
    
    # MySQL settings
    RDS_MYSQL_HOST=your-mysql-instance.rds.amazonaws.com
    RDS_MYSQL_PORT=3306
    RDS_MYSQL_USER=admin
    RDS_MYSQL_PASSWORD=your_password
    RDS_MYSQL_DATABASE=mydatabase
    
    # PostgreSQL settings
    RDS_PG_HOST=your-postgres-instance.rds.amazonaws.com
    RDS_PG_PORT=5432
    RDS_PG_USER=postgres
    RDS_PG_PASSWORD=your_password
    RDS_PG_DATABASE=postgres
    ```

2. Use the RDS utility in your tests:
    ```typescript
    import { rds } from '../../playwright/utils/rds';
    
    test('test with RDS data', async ({ page }) => {
      // Connect to PostgreSQL RDS
      const pgConn = await rds.connectToPostgres({
        host: process.env.RDS_PG_HOST,
        port: process.env.RDS_PG_PORT,
        user: process.env.RDS_PG_USER,
        password: process.env.RDS_PG_PASSWORD,
        database: process.env.RDS_PG_DATABASE
      });
      
      // Execute a query
      const products = await rds.query(
        pgConn.connectionId,
        'SELECT * FROM products WHERE category = $1',
        ['electronics']
      );
      
      // Use the data in your test
      console.log(`Found ${products.length} electronics products`);
      
      // Don't forget to close the connection when done
      await rds.closeConnection(pgConn.connectionId);
      await rds.close(); // Close the MCP server if done with all tests
    });
    ```

## MCP (Claude) Integration

The project integrates Claude for AI-assisted testing:

1. Set up your Claude API key in `.env`:
    ```
    CLAUDE_API_KEY=your_api_key_here
    ```

2. Use Claude for data analysis and test enhancements:
    ```typescript
    import { claude } from '../../playwright/utils/claude';
    
    test('AI-enhanced test', async ({ page }) => {
      // Fetch data from database
      const orderData = await db.query('SELECT * FROM orders WHERE order_id = 2885');
      
      // Use Claude to analyze the data
      const analysis = await claude.analyze('Analyze this order data', orderData);
      
      // Use the analysis for test decisions
      if (analysis.suggests_review) {
        // Perform additional test steps
      }
    });
    ```

## CloudWatch Logs Integration

The project integrates with AWS CloudWatch logs for improved test monitoring and debugging:

1. Configure AWS credentials in `.env`:
    ```
    AWS_REGION=us-east-1
    AWS_ACCESS_KEY_ID=your_aws_access_key
    AWS_SECRET_ACCESS_KEY=your_aws_secret_key
    ```

2. Use CloudWatch in your tests:
    ```typescript
    import { cloudwatch } from '../../playwright/utils/cloudwatch';
    
    test('test with CloudWatch logs', async ({ page }) => {
      // Query AWS CloudWatch logs
      const logs = await cloudwatch.queryLogs(
        'my-application-logs',
        'error',
        Date.now() - 60 * 60 * 1000 // past hour
      );
      
      // Use logs for test validation or debugging
      console.log(`Found ${logs.length} error logs`);
      
      // Perform test actions based on log data
      if (logs.length > 0) {
        // Handle error condition
      }
      
      // Clean up MCP connections when done
      await cloudwatch.close();
    });
    ```

## Reference
