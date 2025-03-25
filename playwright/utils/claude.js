const { spawn } = require('child_process');
const axios = require('axios');

/**
 * Claude AI integration using Model Context Protocol
 */
class ClaudeMCP {
  constructor() {
    this.mcpServerProcess = null;
    this.mcpPort = process.env.MCP_PORT || 8080;
    this.baseUrl = `http://localhost:${this.mcpPort}`;
    this.serverReady = false;
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
   * Analyze data using Claude AI through MCP
   * @param {string} prompt - The analysis prompt for Claude
   * @param {any} data - The data to be analyzed
   * @returns {Promise<any>} - The analysis results
   */
  async analyze(prompt, data) {
    try {
      await this.ensureServerRunning();

      // Use Playwright MCP to interact with Claude
      const response = await axios.post(`${this.baseUrl}/execute`, {
        action: 'claudeAnalysis',
        parameters: {
          prompt: prompt,
          data: JSON.stringify(data)
        }
      });

      return response.data.result;
    } catch (error) {
      console.error('Error using Claude MCP:', error.message);
      return { 
        error: error.message, 
        suggests_review: true 
      };
    }
  }

  /**
   * Clean up resources when done
   */
  async close() {
    if (this.mcpServerProcess) {
      this.mcpServerProcess.kill();
      this.mcpServerProcess = null;
      this.serverReady = false;
    }
  }
}

// Export a singleton instance
const claude = new ClaudeMCP();
module.exports = { claude };
