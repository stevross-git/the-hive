/**
 * AI Registry Client Library
 * For AI agents to discover and communicate with other AI models
 * Integrates with the Ultimate Agent network
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

class AIRegistryClient {
    constructor(registryUrl = 'http://localhost:3001', options = {}) {
        this.registryUrl = registryUrl.replace(/\/$/, ''); // Remove trailing slash
        this.cache = new Map();
        this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes
        this.retryAttempts = options.retryAttempts || 3;
        this.timeout = options.timeout || 10000;
        this.userAgent = options.userAgent || 'AIRegistryClient/1.0';
        
        // Subscribe to registry updates if WebSocket is available
        if (typeof WebSocket !== 'undefined' || require) {
            this.subscribeToUpdates();
        }
    }

    /**
     * Find AI models based on criteria
     * @param {Object} criteria - Search criteria
     * @returns {Promise<Array>} Array of matching models
     */
    async findModels(criteria = {}) {
        const cacheKey = JSON.stringify(criteria);
        
        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const response = await this.makeRequest('POST', '/api/models/find', criteria);
            const models = response.models || [];
            
            // Cache the results
            this.cache.set(cacheKey, {
                data: models,
                timestamp: Date.now()
            });
            
            return models;
        } catch (error) {
            console.error('Error finding models:', error.message);
            throw error;
        }
    }

    /**
     * Get communication details for a specific model
     * @param {string} modelId - Model ID
     * @returns {Promise<Object>} Communication details
     */
    async getModelCommunication(modelId) {
        const cacheKey = `communication:${modelId}`;
        
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            const response = await this.makeRequest('GET', `/api/models/${modelId}/communication`);
            const communication = response.communication;
            
            this.cache.set(cacheKey, {
                data: communication,
                timestamp: Date.now()
            });
            
            return communication;
        } catch (error) {
            console.error(`Error getting communication details for ${modelId}:`, error.message);
            throw error;
        }
    }

    /**
     * Discover the best model for a specific task
     * @param {string} taskType - Type of task ('text-generation', 'classification', etc.)
     * @param {Object} requirements - Requirements (maxLatency, minReliability, etc.)
     * @returns {Promise<Object|null>} Best matching model or null
     */
    async discoverModel(taskType, requirements = {}) {
        const criteria = {
            capability: taskType,
            ...requirements
        };

        const models = await this.findModels(criteria);
        
        if (models.length === 0) {
            return null;
        }

        // Return the best model (already sorted by registry)
        return models[0];
    }

    /**
     * Create a model communication client
     * @param {string} modelId - Model ID
     * @returns {Promise<ModelClient>} Model client for communication
     */
    async createModelClient(modelId) {
        const communication = await this.getModelCommunication(modelId);
        return new ModelClient(communication);
    }

    /**
     * Register this agent with the registry
     * @param {Object} agentInfo - Agent information
     * @returns {Promise<Object>} Registration result
     */
    async registerAgent(agentInfo) {
        try {
            const response = await this.makeRequest('POST', '/api/agents/register', agentInfo);
            console.log(`✅ Agent registered: ${agentInfo.name}`);
            return response;
        } catch (error) {
            console.error('Error registering agent:', error.message);
            throw error;
        }
    }

    /**
     * Update agent status (heartbeat)
     * @param {string} agentId - Agent ID
     * @param {Object} status - Status update
     * @returns {Promise<boolean>} Success
     */
    async updateAgentStatus(agentId, status) {
        try {
            await this.makeRequest('PUT', `/api/agents/${agentId}`, status);
            return true;
        } catch (error) {
            console.error('Error updating agent status:', error.message);
            return false;
        }
    }

    /**
     * Get all available models
     * @returns {Promise<Array>} All models
     */
    async getAllModels() {
        try {
            const response = await this.makeRequest('GET', '/api/models');
            return response.models || [];
        } catch (error) {
            console.error('Error getting all models:', error.message);
            throw error;
        }
    }

    /**
     * Get registry statistics
     * @returns {Promise<Object>} Registry stats
     */
    async getStats() {
        try {
            const response = await this.makeRequest('GET', '/api/stats');
            return response;
        } catch (error) {
            console.error('Error getting stats:', error.message);
            throw error;
        }
    }

    /**
     * Subscribe to registry updates via WebSocket
     */
    subscribeToUpdates() {
        try {
            let WebSocket;
            if (typeof window !== 'undefined') {
                WebSocket = window.WebSocket;
            } else {
                WebSocket = require('ws');
            }

            const wsUrl = this.registryUrl.replace(/^http/, 'ws');
            this.ws = new WebSocket(wsUrl);

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleRegistryUpdate(message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.ws.onclose = () => {
                // Reconnect after 5 seconds
                setTimeout(() => this.subscribeToUpdates(), 5000);
            };

        } catch (error) {
            console.warn('WebSocket not available, updates will be polled');
        }
    }

    /**
     * Handle registry updates
     * @param {Object} message - Update message
     */
    handleRegistryUpdate(message) {
        // Clear relevant cache entries
        if (message.event === 'model_registered' || message.event === 'model_updated' || message.event === 'model_removed') {
            // Clear all find queries cache
            for (const key of this.cache.keys()) {
                if (key.startsWith('{') || key.startsWith('communication:')) {
                    this.cache.delete(key);
                }
            }
        }
    }

    /**
     * Make HTTP request to registry
     * @param {string} method - HTTP method
     * @param {string} path - API path
     * @param {Object} data - Request data
     * @returns {Promise<Object>} Response data
     */
    async makeRequest(method, path, data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.registryUrl);
            const isHttps = url.protocol === 'https:';
            const lib = isHttps ? https : http;

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: method.toUpperCase(),
                timeout: this.timeout,
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'application/json'
                }
            };

            if (data) {
                const jsonData = JSON.stringify(data);
                options.headers['Content-Type'] = 'application/json';
                options.headers['Content-Length'] = Buffer.byteLength(jsonData);
            }

            const req = lib.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(responseData);
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(parsed);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error || parsed.message || 'Unknown error'}`));
                        }
                    } catch (error) {
                        reject(new Error(`Invalid JSON response: ${error.message}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }
}

/**
 * Model Client for communicating with a specific AI model
 */
class ModelClient {
    constructor(communication) {
        this.communication = communication;
        this.endpoint = communication.endpoint;
        this.schema = communication.communicationSchema;
        this.name = communication.name;
    }

    /**
     * Send a request to the AI model
     * @param {string} prompt - Input prompt or message
     * @param {Object} options - Additional options
     * @returns {Promise<string>} Model response
     */
    async query(prompt, options = {}) {
        try {
            const requestData = this.buildRequest(prompt, options);
            const response = await this.sendRequest(requestData);
            return this.parseResponse(response);
        } catch (error) {
            console.error(`Error querying model ${this.name}:`, error.message);
            throw error;
        }
    }

    /**
     * Build request based on model's communication schema
     * @param {string} prompt - Input prompt
     * @param {Object} options - Options
     * @returns {Object} Request data
     */
    buildRequest(prompt, options) {
        const format = this.schema.requestFormat;
        
        switch (format) {
            case 'openai-compatible':
                return {
                    model: this.name,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: options.maxTokens || 150,
                    temperature: options.temperature || 0.7,
                    ...options
                };
                
            case 'anthropic':
                return {
                    model: this.name,
                    max_tokens: options.maxTokens || 150,
                    messages: [{ role: 'user', content: prompt }],
                    ...options
                };
                
            case 'ollama':
                return {
                    model: this.name,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: options.temperature || 0.7,
                        ...options
                    }
                };
                
            default:
                return { prompt, ...options };
        }
    }

    /**
     * Send HTTP request to model endpoint
     * @param {Object} requestData - Request data
     * @returns {Promise<Object>} Response
     */
    async sendRequest(requestData) {
        return new Promise((resolve, reject) => {
            const url = new URL(this.getEndpointPath(), this.endpoint);
            const isHttps = url.protocol === 'https:';
            const lib = isHttps ? require('https') : require('http');

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'AIRegistryClient/1.0'
                }
            };

            // Add authentication if required
            if (this.schema.authMethod === 'api-key' && this.communication.apiKey) {
                if (this.schema.requestFormat === 'anthropic') {
                    options.headers['x-api-key'] = this.communication.apiKey;
                    options.headers['anthropic-version'] = '2023-06-01';
                } else {
                    options.headers['Authorization'] = `Bearer ${this.communication.apiKey}`;
                }
            }

            const req = lib.request(options, (res) => {
                let responseData = '';
                res.on('data', chunk => responseData += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(responseData));
                    } catch (error) {
                        reject(new Error(`Invalid JSON response: ${error.message}`));
                    }
                });
            });

            req.on('error', reject);
            req.write(JSON.stringify(requestData));
            req.end();
        });
    }

    /**
     * Get the correct endpoint path for the model type
     * @returns {string} Endpoint path
     */
    getEndpointPath() {
        const format = this.schema.requestFormat;
        
        switch (format) {
            case 'openai-compatible':
                return '/v1/chat/completions';
            case 'anthropic':
                return '/v1/messages';
            case 'ollama':
                return '/api/generate';
            default:
                return '/';
        }
    }

    /**
     * Parse response based on model's communication schema
     * @param {Object} response - Raw response
     * @returns {string} Parsed response text
     */
    parseResponse(response) {
        const format = this.schema.responseFormat;
        
        switch (format) {
            case 'openai-compatible':
                return response.choices?.[0]?.message?.content || response.choices?.[0]?.text || 'No response';
                
            case 'anthropic':
                return response.content?.[0]?.text || 'No response';
                
            case 'ollama':
                return response.response || 'No response';
                
            default:
                return response.text || response.response || response.output || JSON.stringify(response);
        }
    }
}

// Export for both Node.js and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AIRegistryClient, ModelClient };
} else if (typeof window !== 'undefined') {
    window.AIRegistryClient = AIRegistryClient;
    window.ModelClient = ModelClient;
}

// Example usage:
/*

// Initialize the registry client
const registryClient = new AIRegistryClient('http://localhost:3001');

// Register this agent
await registryClient.registerAgent({
    name: 'my-ultimate-agent',
    type: 'ultimate-agent',
    endpoint: 'http://localhost:8080',
    capabilities: ['text-processing', 'data-analysis'],
    availableModels: ['sentiment-analysis', 'classification']
});

// Find a model for text generation
const model = await registryClient.discoverModel('text-generation', {
    maxLatency: 5000,
    minReliability: 0.9
});

if (model) {
    // Create a client for the model
    const modelClient = await registryClient.createModelClient(model.id);
    
    // Query the model
    const response = await modelClient.query('Hello, how can you help me?');
    console.log('Model response:', response);
}

// Find all vision models
const visionModels = await registryClient.findModels({
    type: 'vision'
});

console.log('Available vision models:', visionModels);

*/