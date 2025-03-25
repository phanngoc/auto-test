const axios = require('axios');
const { spawn } = require('child_process');

/**
 * AWS RDS integration using Model Context Protocol
 */
class RdsMCP {
  constructor() {
    this.mcpServerProcess = null;
    this.mcpPort = process.env.MCP_PORT || 8080;
    this.baseUrl = `http://localhost:${this.mcpPort}`;
    this.serverReady = false;
    this.connections = {};
  }

  /**
   * Start the MCP server if it's not already running
   */
  async ensureServerRunning() {
    if (this.serverReady) {
      return;
    }

    // Start the Playwright MCP server if not already running
    if (!this.mcpServerProcess) {
      console.log('Starting Playwright MCP server...');
      this.mcpServerProcess = spawn('npx', [
        '@executeautomation/playwright-mcp-server',
        '--port', this.mcpPort.toString()
      ]);

      this.mcpServerProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`MCP Server: ${output}`);
        if (output.includes('Server is running')) {
          this.serverReady = true;
        }
      });

      this.mcpServerProcess.stderr.on('data', (data) => {
        console.error(`MCP Server Error: ${data}`);
      });

      // Wait for server to be ready
      let attempts = 0;
      while (!this.serverReady && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      if (!this.serverReady) {
        throw new Error('Failed to start MCP Server');
      }
    }
  }

  /**
   * Get list of RDS instances in your AWS account
   */
  async listInstances() {
    try {
      await this.ensureServerRunning();
      
      const response = await axios.post(`${this.baseUrl}/execute`, {
        action: 'rdsGetInstances',
        parameters: {}
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      return response.data.result;
    } catch (error) {
      console.error('Error listing RDS instances:', error.message);
      throw error;
    }
  }

  /**
   * Connect to MySQL RDS database
   * @param {Object} config Connection configuration
   * @returns {Promise<Object>} Connection information
   */
  async connectToMySql(config) {
    try {
      await this.ensureServerRunning();
      
      const response = await axios.post(`${this.baseUrl}/execute`, {
        action: 'rdsConnectMySql',
        parameters: config
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const connectionInfo = response.data.result;
      this.connections[connectionInfo.connectionId] = connectionInfo;
      
      return connectionInfo;
    } catch (error) {
      console.error('Error connecting to MySQL RDS:', error.message);
      throw error;
    }
  }

  /**
   * Connect to PostgreSQL RDS database
   * @param {Object} config Connection configuration
   * @returns {Promise<Object>} Connection information
   */
  async connectToPostgres(config) {
    try {
      await this.ensureServerRunning();
      
      const response = await axios.post(`${this.baseUrl}/execute`, {
        action: 'rdsConnectPostgres',
        parameters: config
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const connectionInfo = response.data.result;
      this.connections[connectionInfo.connectionId] = connectionInfo;
      
      return connectionInfo;
    } catch (error) {
      console.error('Error connecting to PostgreSQL RDS:', error.message);
      throw error;
    }
  }

  /**
   * Execute a SQL query on a connected RDS database
   * @param {string} connectionId The connection ID to use
   * @param {string} query SQL query to execute
   * @param {Array} values Query parameter values (optional)
   * @returns {Promise<Array>} Query results
   */
  async query(connectionId, query, values = []) {
    try {
      await this.ensureServerRunning();
      
      if (!this.connections[connectionId]) {
        throw new Error(`Connection ${connectionId} not found or closed`);
      }

      const response = await axios.post(`${this.baseUrl}/execute`, {
        action: 'rdsExecuteQuery',
        parameters: {
          connectionId,
          query,
          values
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      return response.data.result;
    } catch (error) {
      console.error('Error executing RDS query:', error.message);
      throw error;
    }
  }

  /**
   * Execute a transaction with multiple SQL queries
   * @param {string} connectionId The connection ID to use
   * @param {Array<Object>} queries Array of query objects with sql and values properties
   * @returns {Promise<Array>} Transaction results
   */
  async transaction(connectionId, queries) {
    try {
      await this.ensureServerRunning();
      
      if (!this.connections[connectionId]) {
        throw new Error(`Connection ${connectionId} not found or closed`);
      }

      const response = await axios.post(`${this.baseUrl}/execute`, {
        action: 'rdsExecuteTransaction',
        parameters: {
          connectionId,
          queries
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      return response.data.result;
    } catch (error) {
      console.error('Error executing RDS transaction:', error.message);
      throw error;
    }
  }

  /**
   * Close a database connection
   * @param {string} connectionId The connection ID to close
   * @returns {Promise<Object>} Closure result
   */
  async closeConnection(connectionId) {
    try {
      await this.ensureServerRunning();
      
      const response = await axios.post(`${this.baseUrl}/execute`, {
        action: 'rdsCloseConnection',
        parameters: {
          connectionId
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      delete this.connections[connectionId];
      return response.data.result;
    } catch (error) {
      console.error('Error closing RDS connection:', error.message);
      throw error;
    }
  }

  /**
   * Clean up resources when done
   */
  async close() {
    try {
      // Close all open connections
      for (const connectionId of Object.keys(this.connections)) {
        try {
          await this.closeConnection(connectionId);
        } catch (err) {
          console.error(`Error closing connection ${connectionId}:`, err.message);
        }
      }

      // Shut down MCP server
      if (this.mcpServerProcess) {
        this.mcpServerProcess.kill();
        this.mcpServerProcess = null;
        this.serverReady = false;
      }
    } catch (error) {
      console.error('Error during RDS MCP cleanup:', error.message);
    }
  }
}

// Export a singleton instance
const rds = new RdsMCP();
module.exports = { rds };
