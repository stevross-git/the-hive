#!/usr/bin/env node

/**
 * AI Model Registry Server
 * A DNS-like registry for AI models and their communication protocols
 * Designed to work with the existing Ultimate Agent network
 */

const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');
const WebSocket = require('ws');
const http = require('http');

class AIModelRegistry {
    constructor() {
        this.models = new Map();
        this.agents = new Map();
        this.networks = new Map();
        this.dataFile = './ai-registry-data.json';
        this.wsClients = new Set();
        
        // Load existing data on startup
        this.loadData();
        
        // Auto-save every 30 seconds
        setInterval(() => this.saveData(), 30000);
    }

    async loadData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            const parsed = JSON.parse(data);
            
            if (parsed.models) {
                this.models = new Map(Object.entries(parsed.models));
            }
            if (parsed.agents) {
                this.agents = new Map(Object.entries(parsed.agents));
            }
            if (parsed.networks) {
                this.networks = new Map(Object.entries(parsed.networks));
            }
            
            console.log(`✅ Loaded ${this.models.size} models, ${this.agents.size} agents, ${this.networks.size} networks`);
        } catch (error) {
            console.log('📝 No existing data file, starting fresh');
        }
    }

    async saveData() {
        try {
            const data = {
                models: Object.fromEntries(this.models),
                agents: Object.fromEntries(this.agents),
                networks: Object.fromEntries(this.networks),
                lastUpdated: new Date().toISOString()
            };
            
            await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('❌ Failed to save data:', error.message);
        }
    }

    // Register a new AI model/service
    registerModel(modelData) {
        const modelId = modelData.id || uuidv4();
        const timestamp = new Date().toISOString();
        
        const modelEntry = {
            id: modelId,
            name: modelData.name,
            type: modelData.type, // 'llm', 'vision', 'audio', 'embedding', etc.
            provider: modelData.provider, // 'openai', 'anthropic', 'ollama', 'local', etc.
            
            // Connection details
            endpoint: modelData.endpoint,
            apiKey: modelData.apiKey, // Optional, for secured models
            protocol: modelData.protocol || 'https', // http, https, websocket, grpc
            
            // Model capabilities
            capabilities: modelData.capabilities || [],
            inputFormats: modelData.inputFormats || ['text'],
            outputFormats: modelData.outputFormats || ['text'],
            maxTokens: modelData.maxTokens,
            contextWindow: modelData.contextWindow,
            
            // Communication details
            communicationSchema: modelData.communicationSchema || {
                requestFormat: 'openai-compatible',
                responseFormat: 'openai-compatible',
                streamingSupported: false,
                authMethod: 'api-key'
            },
            
            // Performance & availability
            latencyMs: modelData.latencyMs || null,
            reliability: modelData.reliability || 1.0,
            costPerToken: modelData.costPerToken || null,
            rateLimit: modelData.rateLimit || null,
            
            // Metadata
            description: modelData.description,
            tags: modelData.tags || [],
            version: modelData.version || '1.0',
            
            // Registry metadata
            registeredAt: timestamp,
            lastSeen: timestamp,
            lastUpdated: timestamp,
            status: 'active',
            registeredBy: modelData.registeredBy || 'manual'
        };

        this.models.set(modelId, modelEntry);
        this.broadcastUpdate('model_registered', modelEntry);
        
        console.log(`✅ Registered model: ${modelEntry.name} (${modelId})`);
        return modelEntry;
    }

    // Register an AI agent
    registerAgent(agentData) {
        const agentId = agentData.id || uuidv4();
        const timestamp = new Date().toISOString();
        
        const agentEntry = {
            id: agentId,
            name: agentData.name,
            type: agentData.type || 'ultimate-agent',
            
            // Connection details
            endpoint: agentData.endpoint,
            dashboardPort: agentData.dashboardPort,
            capabilities: agentData.capabilities || [],
            
            // Available models on this agent
            availableModels: agentData.availableModels || [],
            preferredModels: agentData.preferredModels || [],
            
            // Network information
            networkId: agentData.networkId,
            nodeUrl: agentData.nodeUrl,
            
            // Status
            status: agentData.status || 'online',
            lastHeartbeat: timestamp,
            registeredAt: timestamp,
            registeredBy: agentData.registeredBy || 'auto'
        };

        this.agents.set(agentId, agentEntry);
        this.broadcastUpdate('agent_registered', agentEntry);
        
        console.log(`✅ Registered agent: ${agentEntry.name} (${agentId})`);
        return agentEntry;
    }

    // Find models by criteria
    findModels(criteria = {}) {
        const results = [];
        
        for (const [id, model] of this.models) {
            let matches = true;
            
            if (criteria.type && model.type !== criteria.type) matches = false;
            if (criteria.provider && model.provider !== criteria.provider) matches = false;
            if (criteria.capability && !model.capabilities.includes(criteria.capability)) matches = false;
            if (criteria.inputFormat && !model.inputFormats.includes(criteria.inputFormat)) matches = false;
            if (criteria.outputFormat && !model.outputFormats.includes(criteria.outputFormat)) matches = false;
            if (criteria.maxLatency && model.latencyMs > criteria.maxLatency) matches = false;
            if (criteria.minReliability && model.reliability < criteria.minReliability) matches = false;
            if (criteria.tags && !criteria.tags.every(tag => model.tags.includes(tag))) matches = false;
            
            if (matches) {
                results.push(model);
            }
        }
        
        // Sort by reliability and latency
        return results.sort((a, b) => {
            if (a.reliability !== b.reliability) {
                return b.reliability - a.reliability; // Higher reliability first
            }
            return (a.latencyMs || 999999) - (b.latencyMs || 999999); // Lower latency first
        });
    }

    // Get communication details for a model
    getModelCommunication(modelId) {
        const model = this.models.get(modelId);
        if (!model) return null;
        
        return {
            id: model.id,
            name: model.name,
            endpoint: model.endpoint,
            protocol: model.protocol,
            communicationSchema: model.communicationSchema,
            authMethod: model.communicationSchema.authMethod,
            apiKey: model.apiKey ? '***hidden***' : null,
            exampleRequest: this.generateExampleRequest(model),
            exampleResponse: this.generateExampleResponse(model)
        };
    }

    generateExampleRequest(model) {
        const examples = {
            'openai-compatible': {
                method: 'POST',
                endpoint: `${model.endpoint}/v1/chat/completions`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer YOUR_API_KEY'
                },
                body: {
                    model: model.name,
                    messages: [
                        { role: 'user', content: 'Hello, how can you help me?' }
                    ],
                    max_tokens: 150,
                    temperature: 0.7
                }
            },
            'anthropic': {
                method: 'POST',
                endpoint: `${model.endpoint}/v1/messages`,
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': 'YOUR_API_KEY',
                    'anthropic-version': '2023-06-01'
                },
                body: {
                    model: model.name,
                    max_tokens: 150,
                    messages: [
                        { role: 'user', content: 'Hello, how can you help me?' }
                    ]
                }
            },
            'ollama': {
                method: 'POST',
                endpoint: `${model.endpoint}/api/generate`,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: {
                    model: model.name,
                    prompt: 'Hello, how can you help me?',
                    stream: false
                }
            }
        };
        
        return examples[model.communicationSchema.requestFormat] || examples['openai-compatible'];
    }

    generateExampleResponse(model) {
        const examples = {
            'openai-compatible': {
                id: 'chatcmpl-123',
                object: 'chat.completion',
                created: Math.floor(Date.now() / 1000),
                model: model.name,
                choices: [
                    {
                        index: 0,
                        message: {
                            role: 'assistant',
                            content: 'Hello! I can help you with various tasks...'
                        },
                        finish_reason: 'stop'
                    }
                ]
            },
            'anthropic': {
                id: 'msg_123',
                type: 'message',
                role: 'assistant',
                content: [
                    {
                        type: 'text',
                        text: 'Hello! I can help you with various tasks...'
                    }
                ],
                model: model.name,
                stop_reason: 'end_turn'
            },
            'ollama': {
                model: model.name,
                created_at: new Date().toISOString(),
                response: 'Hello! I can help you with various tasks...',
                done: true
            }
        };
        
        return examples[model.communicationSchema.responseFormat] || examples['openai-compatible'];
    }

    // Update model status (heartbeat)
    updateModelStatus(modelId, status = 'active') {
        const model = this.models.get(modelId);
        if (model) {
            model.lastSeen = new Date().toISOString();
            model.status = status;
            this.broadcastUpdate('model_updated', model);
        }
    }

    // Remove model
    removeModel(modelId) {
        const model = this.models.get(modelId);
        if (model) {
            this.models.delete(modelId);
            this.broadcastUpdate('model_removed', { id: modelId });
            console.log(`❌ Removed model: ${model.name} (${modelId})`);
            return true;
        }
        return false;
    }

    // WebSocket broadcasting
    broadcastUpdate(event, data) {
        const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
        this.wsClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    // Get registry statistics
    getStats() {
        const modelsByType = {};
        const modelsByProvider = {};
        let totalModels = 0;
        let activeModels = 0;

        for (const model of this.models.values()) {
            totalModels++;
            if (model.status === 'active') activeModels++;
            
            modelsByType[model.type] = (modelsByType[model.type] || 0) + 1;
            modelsByProvider[model.provider] = (modelsByProvider[model.provider] || 0) + 1;
        }

        return {
            totalModels,
            activeModels,
            totalAgents: this.agents.size,
            modelsByType,
            modelsByProvider,
            uptime: process.uptime(),
            lastUpdated: new Date().toISOString()
        };
    }
}

// Express server setup
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const registry = new AIModelRegistry();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// WebSocket handling
wss.on('connection', (ws) => {
    registry.wsClients.add(ws);
    console.log('📡 New WebSocket client connected');
    
    ws.on('close', () => {
        registry.wsClients.delete(ws);
        console.log('📡 WebSocket client disconnected');
    });
});

// API Routes

// Get registry info
app.get('/api/info', (req, res) => {
    res.json({
        name: 'AI Model Registry',
        version: '1.0.0',
        description: 'DNS-like registry for AI models and communication protocols',
        stats: registry.getStats()
    });
});

// Register a new model
app.post('/api/models/register', (req, res) => {
    try {
        const model = registry.registerModel(req.body);
        res.json({ success: true, model });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get all models
app.get('/api/models', (req, res) => {
    const models = Array.from(registry.models.values());
    res.json({ models, count: models.length });
});

// Find models by criteria
app.post('/api/models/find', (req, res) => {
    const criteria = req.body;
    const models = registry.findModels(criteria);
    res.json({ models, count: models.length, criteria });
});

// Get specific model
app.get('/api/models/:id', (req, res) => {
    const model = registry.models.get(req.params.id);
    if (model) {
        res.json({ model });
    } else {
        res.status(404).json({ error: 'Model not found' });
    }
});

// Get model communication details
app.get('/api/models/:id/communication', (req, res) => {
    const communication = registry.getModelCommunication(req.params.id);
    if (communication) {
        res.json({ communication });
    } else {
        res.status(404).json({ error: 'Model not found' });
    }
});

// Update model
app.put('/api/models/:id', (req, res) => {
    const modelId = req.params.id;
    const existingModel = registry.models.get(modelId);
    
    if (!existingModel) {
        return res.status(404).json({ error: 'Model not found' });
    }
    
    const updatedModel = { ...existingModel, ...req.body, lastUpdated: new Date().toISOString() };
    registry.models.set(modelId, updatedModel);
    registry.broadcastUpdate('model_updated', updatedModel);
    
    res.json({ success: true, model: updatedModel });
});

// Remove model
app.delete('/api/models/:id', (req, res) => {
    const success = registry.removeModel(req.params.id);
    if (success) {
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Model not found' });
    }
});

// Agent registration
app.post('/api/agents/register', (req, res) => {
    try {
        const agent = registry.registerAgent(req.body);
        res.json({ success: true, agent });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get all agents
app.get('/api/agents', (req, res) => {
    const agents = Array.from(registry.agents.values());
    res.json({ agents, count: agents.length });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Registry statistics
app.get('/api/stats', (req, res) => {
    res.json(registry.getStats());
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`
🚀 AI Model Registry Server Started
📡 HTTP Server: http://localhost:${PORT}
🔌 WebSocket: ws://localhost:${PORT}
📊 Dashboard: http://localhost:${PORT}/dashboard.html
📝 API Docs: http://localhost:${PORT}/api/info
    `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down gracefully...');
    await registry.saveData();
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});

module.exports = { AIModelRegistry, app };