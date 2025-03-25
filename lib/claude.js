const axios = require('axios');

/**
 * Claude AI integration for test automation
 */
class Claude {
  constructor() {
    this.apiKey = process.env.CLAUDE_API_KEY;
    this.apiUrl = 'https://api.anthropic.com/v1/messages';
    
    if (!this.apiKey) {
      console.warn('Claude API key not found. Set CLAUDE_API_KEY in your environment variables.');
    }
  }

  /**
   * Analyzes data using Claude AI
   * @param {string} prompt - The analysis prompt for Claude
   * @param {any} data - The data to be analyzed
   * @returns {Promise<any>} - The analysis results
   */
  async analyze(prompt, data) {
    try {
      if (!this.apiKey) {
        throw new Error('Claude API key not configured');
      }

      const response = await axios.post(
        this.apiUrl,
        {
          model: 'claude-3-opus-20240229',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: `${prompt}\n\nData to analyze: ${JSON.stringify(data, null, 2)}`
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );

      // Extract and parse the analysis result
      const result = response.data.content[0].text;
      
      try {
        // Attempt to parse as JSON if possible
        return JSON.parse(result);
      } catch (e) {
        // Return as text if not valid JSON
        return { result, suggests_review: result.toLowerCase().includes('review') };
      }
    } catch (error) {
      console.error('Error using Claude API:', error.message);
      return { 
        error: error.message, 
        suggests_review: true 
      };
    }
  }
}

// Export a singleton instance
const claude = new Claude();
module.exports = { claude };
