/**
 * AI Model Integration Examples
 * Ready-to-use integrations for popular AI services
 * Copy and modify these examples for your specific models
 */

const { AIRegistryClient } = require('./ai-registry-client');
const fs = require('fs').promises;

class ModelIntegrations {
    constructor(registryUrl = 'http://localhost:3001') {
        this.registryClient = new AIRegistryClient(registryUrl);
        this.integrations = new Map();
    }

    /**
     * OpenAI Integration
     */
    async registerOpenAIModels(apiKey) {
        const openaiModels = [
            {
                name: 'gpt-4',
                type: 'llm',
                provider: 'openai',
                endpoint: 'https://api.openai.com',
                apiKey: apiKey,
                description: 'OpenAI GPT-4 - Most capable model',
                capabilities: ['text-generation', 'reasoning', 'code-generation', 'analysis'],
                inputFormats: ['text'],
                outputFormats: ['text'],
                maxTokens: 8192,
                contextWindow: 8192,
                communicationSchema: {
                    requestFormat: 'openai-compatible',
                    responseFormat: 'openai-compatible',
                    streamingSupported: true,
                    authMethod: 'api-key'
                },
                costPerToken: 0.00003,
                reliability: 0.99,
                tags: ['premium', 'reasoning', 'coding']
            },
            {
                name: 'gpt-3.5-turbo',
                type: 'llm',
                provider: 'openai',
                endpoint: 'https://api.openai.com',
                apiKey: apiKey,
                description: 'OpenAI GPT-3.5 Turbo - Fast and efficient',
                capabilities: ['text-generation', 'conversation', 'code-generation'],
                inputFormats: ['text'],
                outputFormats: ['text'],
                maxTokens: 4096,
                contextWindow: 4096,
                communicationSchema: {
                    requestFormat: 'openai-compatible',
                    responseFormat: 'openai-compatible',
                    streamingSupported: true,
                    authMethod: 'api-key'
                },
                costPerToken: 0.000002,
                reliability: 0.98,
                latencyMs: 1500,
                tags: ['fast', 'efficient', 'conversation']
            },
            {
                name: 'dall-e-3',
                type: 'vision',
                provider: 'openai',
                endpoint: 'https://api.openai.com',
                apiKey: apiKey,
                description: 'OpenAI DALL-E 3 - Image generation',
                capabilities: ['image-generation'],
                inputFormats: ['text'],
                outputFormats: ['image'],
                communicationSchema: {
                    requestFormat: 'openai-images',
                    responseFormat: 'openai-images',
                    streamingSupported: false,
                    authMethod: 'api-key'
                },
                reliability: 0.95,
                tags: ['image', 'creative', 'art']
            }
        ];

        for (const model of openaiModels) {
            try {
                const result = await this.registryClient.registerModel(model);
                console.log(`✅ Registered OpenAI model: ${model.name}`);
            } catch (error) {
                console.error(`❌ Failed to register ${model.name}:`, error.message);
            }
        }
    }

    /**
     * Anthropic Integration (Claude models)
     */
    async registerAnthropicModels(apiKey) {
        const anthropicModels = [
            {
                name: 'claude-sonnet-4',
                type: 'llm',
                provider: 'anthropic',
                endpoint: 'https://api.anthropic.com',
                apiKey: apiKey,
                description: 'Anthropic Claude Sonnet 4 - Balanced performance',
                capabilities: ['text-generation', 'analysis', 'reasoning', 'code-generation', 'research'],
                inputFormats: ['text'],
                outputFormats: ['text'],
                maxTokens: 4096,
                contextWindow: 200000,
                communicationSchema: {
                    requestFormat: 'anthropic',
                    responseFormat: 'anthropic',
                    streamingSupported: true,
                    authMethod: 'api-key'
                },
                reliability: 0.99,
                latencyMs: 2000,
                tags: ['balanced', 'analysis', 'research', 'reasoning']
            },
            {
                name: 'claude-opus-4',
                type: 'llm',
                provider: 'anthropic',
                endpoint: 'https://api.anthropic.com',
                apiKey: apiKey,
                description: 'Anthropic Claude Opus 4 - Most capable model',
                capabilities: ['text-generation', 'complex-reasoning', 'research', 'code-generation', 'analysis'],
                inputFormats: ['text'],
                outputFormats: ['text'],
                maxTokens: 4096,
                contextWindow: 200000,
                communicationSchema: {
                    requestFormat: 'anthropic',
                    responseFormat: 'anthropic',
                    streamingSupported: true,
                    authMethod: 'api-key'
                },
                reliability: 0.99,
                latencyMs: 3000,
                tags: ['premium', 'complex-reasoning', 'research']
            }
        ];

        for (const model of anthropicModels) {
            try {
                const result = await this.registryClient.registerModel(model);
                console.log(`✅ Registered Anthropic model: ${model.name}`);
            } catch (error) {
                console.error(`❌ Failed to register ${model.name}:`, error.message);
            }
        }
    }

    /**
     * Ollama Integration (Local models)
     */
    async registerOllamaModels(ollamaEndpoint = 'http://localhost:11434') {
        // First, discover available models from Ollama
        const availableModels = await this.discoverOllamaModels(ollamaEndpoint);
        
        const ollamaModelConfigs = {
            'llama2': {
                description: 'Meta Llama 2 - Open source LLM',
                capabilities: ['text-generation', 'conversation'],
                tags: ['open-source', 'local', 'meta']
            },
            'codellama': {
                description: 'Code Llama - Code generation specialist',
                capabilities: ['code-generation', 'code-explanation', 'debugging'],
                tags: ['coding', 'programming', 'local']
            },
            'mistral': {
                description: 'Mistral 7B - Efficient French model',
                capabilities: ['text-generation', 'multilingual'],
                tags: ['efficient', 'multilingual', 'local']
            },
            'neural-chat': {
                description: 'Neural Chat - Conversation optimized',
                capabilities: ['conversation', 'chat', 'assistance'],
                tags: ['chat', 'assistant', 'local']
            },
            'deepseek-r1': {
                description: 'DeepSeek R1 - Reasoning specialist',
                capabilities: ['reasoning', 'math', 'analysis'],
                tags: ['reasoning', 'math', 'local']
            }
        };

        for (const modelName of availableModels) {
            const config = ollamaModelConfigs[modelName] || {
                description: `Ollama model: ${modelName}`,
                capabilities: ['text-generation'],
                tags: ['local', 'ollama']
            };

            const model = {
                name: modelName,
                type: 'llm',
                provider: 'ollama',
                endpoint: ollamaEndpoint,
                description: config.description,
                capabilities: config.capabilities,
                inputFormats: ['text'],
                outputFormats: ['text'],
                communicationSchema: {
                    requestFormat: 'ollama',
                    responseFormat: 'ollama',
                    streamingSupported: true,
                    authMethod: 'none'
                },
                reliability: 0.95,
                latencyMs: 3000,
                tags: config.tags,
                registeredBy: 'ollama-integration'
            };

            try {
                const result = await this.registryClient.registerModel(model);
                console.log(`✅ Registered Ollama model: ${modelName}`);
            } catch (error) {
                console.error(`❌ Failed to register ${modelName}:`, error.message);
            }
        }
    }

    /**
     * Discover available Ollama models
     */
    async discoverOllamaModels(endpoint) {
        try {
            const http = require('http');
            const { URL } = require('url');
            const url = new URL('/api/tags', endpoint);
            
            return new Promise((resolve, reject) => {
                const req = http.get(url, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            const parsed = JSON.parse(data);
                            const models = parsed.models?.map(m => m.name.split(':')[0]) || [];
                            resolve([...new Set(models)]); // Remove duplicates
                        } catch (error) {
                            resolve([]); // Return empty array if parsing fails
                        }
                    });
                });
                req.on('error', () => resolve([]));
                req.setTimeout(5000, () => {
                    req.destroy();
                    resolve([]);
                });
            });
        } catch (error) {
            console.warn('Could not discover Ollama models:', error.message);
            return [];
        }
    }

    /**
     * Hugging Face Integration
     */
    async registerHuggingFaceModels(apiKey, models = []) {
        const defaultModels = [
            {
                name: 'facebook/bart-large-cnn',
                type: 'nlp',
                description: 'BART Large CNN - Text summarization',
                capabilities: ['summarization'],
                endpoint: 'https://api-inference.huggingface.co/models/facebook/bart-large-cnn'
            },
            {
                name: 'sentence-transformers/all-MiniLM-L6-v2',
                type: 'embedding',
                description: 'All MiniLM L6 v2 - Sentence embeddings',
                capabilities: ['embedding', 'similarity'],
                endpoint: 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2'
            },
            {
                name: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
                type: 'nlp',
                description: 'Twitter RoBERTa - Sentiment analysis',
                capabilities: ['sentiment-analysis', 'classification'],
                endpoint: 'https://api-inference.huggingface.co/models/cardiffnlp/twitter-roberta-base-sentiment-latest'
            }
        ];

        const modelsToRegister = models.length > 0 ? models : defaultModels;

        for (const modelConfig of modelsToRegister) {
            const model = {
                name: modelConfig.name,
                type: modelConfig.type,
                provider: 'huggingface',
                endpoint: modelConfig.endpoint,
                apiKey: apiKey,
                description: modelConfig.description,
                capabilities: modelConfig.capabilities,
                inputFormats: ['text'],
                outputFormats: ['text', 'json'],
                communicationSchema: {
                    requestFormat: 'huggingface',
                    responseFormat: 'huggingface',
                    streamingSupported: false,
                    authMethod: 'api-key'
                },
                reliability: 0.92,
                latencyMs: 2500,
                tags: ['huggingface', 'open-source', 'transformer']
            };

            try {
                const result = await this.registryClient.registerModel(model);
                console.log(`✅ Registered Hugging Face model: ${model.name}`);
            } catch (error) {
                console.error(`❌ Failed to register ${model.name}:`, error.message);
            }
        }
    }

    /**
     * Local Custom Model Integration
     */
    async registerLocalModel(config) {
        const model = {
            name: config.name,
            type: config.type || 'llm',
            provider: 'local',
            endpoint: config.endpoint,
            description: config.description || `Local model: ${config.name}`,
            capabilities: config.capabilities || ['text-generation'],
            inputFormats: config.inputFormats || ['text'],
            outputFormats: config.outputFormats || ['text'],
            communicationSchema: config.communicationSchema || {
                requestFormat: 'custom',
                responseFormat: 'custom',
                streamingSupported: false,
                authMethod: 'none'
            },
            reliability: config.reliability || 0.9,
            latencyMs: config.latencyMs || 5000,
            tags: ['local', 'custom', ...(config.tags || [])],
            registeredBy: 'local-integration'
        };

        try {
            const result = await this.registryClient.registerModel(model);
            console.log(`✅ Registered local model: ${model.name}`);
            return result;
        } catch (error) {
            console.error(`❌ Failed to register ${model.name}:`, error.message);
            throw error;
        }
    }

    /**
     * Auto-discover and register models from configuration
     */
    async autoRegisterFromConfig(configFile = './model-config.json') {
        try {
            const configData = await fs.readFile(configFile, 'utf8');
            const config = JSON.parse(configData);

            console.log('🔍 Auto-registering models from configuration...');

            // OpenAI models
            if (config.openai?.apiKey) {
                console.log('📡 Registering OpenAI models...');
                await this.registerOpenAIModels(config.openai.apiKey);
            }

            // Anthropic models
            if (config.anthropic?.apiKey) {
                console.log('📡 Registering Anthropic models...');
                await this.registerAnthropicModels(config.anthropic.apiKey);
            }

            // Ollama models
            if (config.ollama?.enabled) {
                console.log('📡 Registering Ollama models...');
                await this.registerOllamaModels(config.ollama.endpoint);
            }

            // Hugging Face models
            if (config.huggingface?.apiKey) {
                console.log('📡 Registering Hugging Face models...');
                await this.registerHuggingFaceModels(
                    config.huggingface.apiKey, 
                    config.huggingface.models
                );
            }

            // Custom local models
            if (config.local?.models) {
                console.log('📡 Registering local models...');
                for (const localModel of config.local.models) {
                    await this.registerLocalModel(localModel);
                }
            }

            console.log('✅ Auto-registration completed!');

        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('📝 No configuration file found. Creating example...');
                await this.createExampleConfig(configFile);
            } else {
                console.error('❌ Error during auto-registration:', error.message);
            }
        }
    }

    /**
     * Create example configuration file
     */
    async createExampleConfig(configFile) {
        const exampleConfig = {
            "openai": {
                "apiKey": "sk-your-openai-key-here",
                "enabled": true
            },
            "anthropic": {
                "apiKey": "your-anthropic-key-here", 
                "enabled": true
            },
            "ollama": {
                "endpoint": "http://localhost:11434",
                "enabled": true
            },
            "huggingface": {
                "apiKey": "your-hf-token-here",
                "enabled": false,
                "models": [
                    {
                        "name": "facebook/bart-large-cnn",
                        "type": "nlp",
                        "description": "BART Large CNN - Text summarization",
                        "capabilities": ["summarization"],
                        "endpoint": "https://api-inference.huggingface.co/models/facebook/bart-large-cnn"
                    }
                ]
            },
            "local": {
                "enabled": true,
                "models": [
                    {
                        "name": "my-local-model",
                        "type": "llm",
                        "endpoint": "http://localhost:8000",
                        "description": "Custom local AI model",
                        "capabilities": ["text-generation"],
                        "communicationSchema": {
                            "requestFormat": "custom",
                            "responseFormat": "custom",
                            "streamingSupported": false,
                            "authMethod": "none"
                        }
                    }
                ]
            }
        };

        await fs.writeFile(configFile, JSON.stringify(exampleConfig, null, 2));
        console.log(`📝 Created example configuration: ${configFile}`);
        console.log('📝 Edit the file with your API keys and model configurations');
    }

    /**
     * Bulk model health check
     */
    async healthCheckModels() {
        console.log('🏥 Running health check on all registered models...');
        
        const models = await this.registryClient.getAllModels();
        const results = {
            healthy: [],
            unhealthy: [],
            unknown: []
        };

        for (const model of models) {
            try {
                const isHealthy = await this.checkModelHealth(model);
                if (isHealthy === true) {
                    results.healthy.push(model.name);
                } else if (isHealthy === false) {
                    results.unhealthy.push(model.name);
                } else {
                    results.unknown.push(model.name);
                }
            } catch (error) {
                results.unhealthy.push(model.name);
            }
        }

        console.log(`✅ Healthy models: ${results.healthy.length}`);
        console.log(`❌ Unhealthy models: ${results.unhealthy.length}`);
        console.log(`❓ Unknown status: ${results.unknown.length}`);

        return results;
    }

    /**
     * Check individual model health
     */
    async checkModelHealth(model) {
        try {
            const client = await this.registryClient.createModelClient(model.id);
            
            // Simple health check query
            const response = await client.query('Hello', { 
                maxTokens: 10,
                timeout: 5000 
            });
            
            return response && response.length > 0;
        } catch (error) {
            console.warn(`Health check failed for ${model.name}:`, error.message);
            return false;
        }
    }
}

// Export the integration class
module.exports = ModelIntegrations;

// CLI interface for easy usage
if (require.main === module) {
    const integrations = new ModelIntegrations();
    
    const command = process.argv[2];
    const args = process.argv.slice(3);

    switch (command) {
        case 'auto-register':
            integrations.autoRegisterFromConfig(args[0]);
            break;
            
        case 'health-check':
            integrations.healthCheckModels();
            break;
            
        case 'register-openai':
            if (!args[0]) {
                console.error('❌ API key required: node model-integrations.js register-openai YOUR_API_KEY');
                process.exit(1);
            }
            integrations.registerOpenAIModels(args[0]);
            break;
            
        case 'register-anthropic':
            if (!args[0]) {
                console.error('❌ API key required: node model-integrations.js register-anthropic YOUR_API_KEY');
                process.exit(1);
            }
            integrations.registerAnthropicModels(args[0]);
            break;
            
        case 'register-ollama':
            integrations.registerOllamaModels(args[0] || 'http://localhost:11434');
            break;
            
        default:
            console.log(`
🧠 AI Model Integrations

Usage:
  node model-integrations.js <command> [args]

Commands:
  auto-register [config-file]     Auto-register from configuration
  health-check                    Check health of all models
  register-openai <api-key>       Register OpenAI models
  register-anthropic <api-key>    Register Anthropic models
  register-ollama [endpoint]      Register Ollama models

Examples:
  node model-integrations.js auto-register
  node model-integrations.js register-openai sk-your-key-here
  node model-integrations.js register-ollama http://localhost:11434
  node model-integrations.js health-check
            `);
            break;
    }
}