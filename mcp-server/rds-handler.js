const mysql = require('mysql2/promise');
const { Client } = require('pg');
const AWS = require('aws-sdk');

/**
 * Handler for AWS RDS database requests via Model Context Protocol
 */
class RdsHandler {
  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1';
    
    // Configure AWS SDK
    AWS.config.update({
      region: this.region,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
    
    this.rds = new AWS.RDS();
    this.connections = {};
  }

  /**
   * Get RDS instance information using AWS SDK
   */
  async getRdsInstances() {
    try {
      const data = await this.rds.describeDBInstances().promise();
      return data.DBInstances.map(instance => ({
        identifier: instance.DBInstanceIdentifier,
        engine: instance.Engine,
        endpoint: instance.Endpoint?.Address,
        port: instance.Endpoint?.Port,
        status: instance.DBInstanceStatus
      }));
    } catch (error) {
      console.error('Error retrieving RDS instances:', error);
      throw error;
    }
  }

  /**
   * Generate authentication token for IAM authentication to RDS
   */
  async getAuthToken(params) {
    try {
      const { hostname, port, username, region } = params;
      
      const signer = new AWS.RDS.Signer({
        region: region || this.region,
        hostname,
        port,
        username
      });
      
      return new Promise((resolve, reject) => {
        signer.getAuthToken({}, (err, token) => {
          if (err) {
            reject(err);
          } else {
            resolve(token);
          }
        });
      });
    } catch (error) {
      console.error('Error generating RDS auth token:', error);
      throw error;
    }
  }

  /**
   * Connect to MySQL RDS instance
   */
  async connectToMySql(params) {
    try {
      const { host, port, user, password, database, useIAM } = params;
      
      let authConfig;
      
      if (useIAM) {
        const token = await this.getAuthToken({
          hostname: host,
          port: port || 3306,
          username: user
        });
        
        authConfig = {
          host,
          port: port || 3306,
          user,
          password: token,
          database,
          ssl: { rejectUnauthorized: true },
          authPlugins: {
            mysql_clear_password: () => () => Buffer.from(token + '\0')
          }
        };
      } else {
        authConfig = {
          host,
          port: port || 3306,
          user,
          password,
          database
        };
      }
      
      const connection = await mysql.createConnection(authConfig);
      const connectionId = `mysql_${host}_${database}_${Date.now()}`;
      this.connections[connectionId] = connection;
      
      return {
        connectionId,
        engine: 'mysql',
        connected: true
      };
    } catch (error) {
      console.error('Error connecting to MySQL RDS:', error);
      throw error;
    }
  }

  /**
   * Connect to PostgreSQL RDS instance
   */
  async connectToPostgres(params) {
    try {
      const { host, port, user, password, database, useIAM } = params;
      
      let authConfig;
      
      if (useIAM) {
        const token = await this.getAuthToken({
          hostname: host,
          port: port || 5432,
          username: user
        });
        
        authConfig = {
          host,
          port: port || 5432,
          user,
          password: token,
          database,
          ssl: { rejectUnauthorized: true }
        };
      } else {
        authConfig = {
          host,
          port: port || 5432,
          user,
          password,
          database,
          ssl: process.env.RDS_SSL === 'true'
        };
      }
      
      const connection = new Client(authConfig);
      await connection.connect();
      const connectionId = `postgres_${host}_${database}_${Date.now()}`;
      this.connections[connectionId] = connection;
      
      return {
        connectionId,
        engine: 'postgres',
        connected: true
      };
    } catch (error) {
      console.error('Error connecting to PostgreSQL RDS:', error);
      throw error;
    }
  }

  /**
   * Execute query on RDS database
   */
  async executeQuery(params) {
    try {
      const { connectionId, query, values } = params;
      
      if (!this.connections[connectionId]) {
        throw new Error(`Connection ${connectionId} not found or closed`);
      }
      
      const connection = this.connections[connectionId];
      let result;
      
      if (connectionId.startsWith('mysql')) {
        // MySQL query
        const [rows] = await connection.query(query, values || []);
        result = rows;
      } else {
        // PostgreSQL query
        const res = await connection.query(query, values || []);
        result = res.rows;
      }
      
      return result;
    } catch (error) {
      console.error('Error executing query on RDS:', error);
      throw error;
    }
  }

  /**
   * Execute transaction on RDS database
   */
  async executeTransaction(params) {
    try {
      const { connectionId, queries } = params;
      
      if (!this.connections[connectionId]) {
        throw new Error(`Connection ${connectionId} not found or closed`);
      }
      
      const connection = this.connections[connectionId];
      let results = [];
      
      if (connectionId.startsWith('mysql')) {
        // MySQL transaction
        await connection.beginTransaction();
        try {
          for (const query of queries) {
            const [rows] = await connection.query(query.sql, query.values || []);
            results.push(rows);
          }
          await connection.commit();
        } catch (err) {
          await connection.rollback();
          throw err;
        }
      } else {
        // PostgreSQL transaction
        await connection.query('BEGIN');
        try {
          for (const query of queries) {
            const res = await connection.query(query.sql, query.values || []);
            results.push(res.rows);
          }
          await connection.query('COMMIT');
        } catch (err) {
          await connection.query('ROLLBACK');
          throw err;
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error executing transaction on RDS:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async closeConnection(params) {
    try {
      const { connectionId } = params;
      
      if (!this.connections[connectionId]) {
        return { closed: true, message: 'Connection not found or already closed' };
      }
      
      const connection = this.connections[connectionId];
      
      if (connectionId.startsWith('mysql')) {
        await connection.end();
      } else {
        await connection.end();
      }
      
      delete this.connections[connectionId];
      return { closed: true };
    } catch (error) {
      console.error('Error closing RDS connection:', error);
      throw error;
    }
  }

  /**
   * Register MCP handlers
   */
  registerHandlers(mcp) {
    mcp.registerHandler('rdsGetInstances', this.getRdsInstances.bind(this));
    mcp.registerHandler('rdsConnectMySql', this.connectToMySql.bind(this));
    mcp.registerHandler('rdsConnectPostgres', this.connectToPostgres.bind(this));
    mcp.registerHandler('rdsExecuteQuery', this.executeQuery.bind(this));
    mcp.registerHandler('rdsExecuteTransaction', this.executeTransaction.bind(this));
    mcp.registerHandler('rdsCloseConnection', this.closeConnection.bind(this));
  }
}

module.exports = { RdsHandler };
