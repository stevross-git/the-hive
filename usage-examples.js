/**
 * Complete Usage Examples for AI Registry System
 * Demonstrates real-world scenarios and integration patterns
 */

const { AIRegistryClient } = require('./ai-registry-client');
const ModelIntegrations = require('./model-integrations');
const { RegistryMonitor } = require('./registry-monitor');

// =============================================================================
// Example 1: Multi-Agent AI Task Distribution System
// =============================================================================

class AITaskDistributor {
    constructor(registryUrl = 'http://localhost:3001') {
        this.registry = new AIRegistryClient(registryUrl);
        this.taskQueue = [];
        this.activeModels = new Map();
    }

    /**
     * Intelligent task routing based on model capabilities and performance
     */
    async routeTask(task) {
        console.log(`🎯 Routing task: ${task.type} - "${task.description}"`);

        // Find suitable models for the task
        const suitableModels = await this.registry.findModels({
            capability: task.type,
            maxLatency: task.maxLatency || 10000,
            minReliability: task.minReliability || 0.8
        });

        if (suitableModels.length === 0) {
            throw new Error(`No suitable models found for task type: ${task.type}`);
        }

        // Select best model based on current load and performance
        const bestModel = await this.selectOptimalModel(suitableModels, task);
        
        console.log(`✅ Selected model: ${bestModel.name} (${bestModel.provider})`);

        // Execute the task
        const result = await this.executeTask(bestModel, task);
        
        return {
            taskId: task.id,
            modelUsed: bestModel.name,
            result: result,
            executionTime: Date.now() - task.startTime
        };
    }

    async selectOptimalModel(models, task) {
        // Score models based on multiple factors
        const scoredModels = await Promise.all(models.map(async (model) => {
            let score = 0;
            
            // Reliability score (40% weight)
            score += (model.reliability || 0.5) * 40;
            
            // Latency score (30% weight) - lower is better
            if (model.latencyMs) {
                const latencyScore = Math.max(0, 30 - (model.latencyMs / 1000) * 10);
                score += latencyScore;
            } else {
                score += 15; // Default score for unknown latency
            }
            
            // Cost score (20% weight) - lower cost is better
            if (model.costPerToken && task.estimatedTokens) {
                const estimatedCost = model.costPerToken * task.estimatedTokens;
                const costScore = Math.max(0, 20 - estimatedCost * 1000);
                score += costScore;
            } else {
                score += 10; // Default score for unknown cost
            }
            
            // Load balancing (10% weight) - prefer less loaded models
            const currentLoad = this.getModelLoad(model.id);
            const loadScore = Math.max(0, 10 - currentLoad * 2);
            score += loadScore;
            
            return { model, score };
        }));

        // Return the highest scoring model
        scoredModels.sort((a, b) => b.score - a.score);
        return scoredModels[0].model;
    }

    async executeTask(model, task) {
        const startTime = Date.now();
        
        try {
            const modelClient = await this.registry.createModelClient(model.id);
            
            // Track model usage
            if (!this.activeModels.has(model.id)) {
                this.activeModels.set(model.id, { requests: 0, totalTime: 0 });
            }
            
            const usage = this.activeModels.get(model.id);
            usage.requests++;
            
            // Execute the task with appropriate prompt
            const prompt = this.buildTaskPrompt(task);
            const result = await modelClient.query(prompt, {
                maxTokens: task.maxTokens || 500,
                temperature: task.temperature || 0.7
            });
            
            const executionTime = Date.now() - startTime;
            usage.totalTime += executionTime;
            
            console.log(`⚡ Task completed in ${executionTime}ms`);
            
            return result;
            
        } catch (error) {
            console.error(`❌ Task execution failed:`, error.message);
            throw error;
        }
    }

    buildTaskPrompt(task) {
        const prompts = {
            'text-generation': `Generate text based on this request: "${task.description}"\n\nRequirements: ${task.requirements || 'None specified'}`,
            'summarization': `Please summarize the following text:\n\n"${task.input}"\n\nSummary style: ${task.style || 'concise'}`,
            'classification': `Classify the following text into one of these categories: ${task.categories.join(', ')}\n\nText: "${task.input}"`,
            'translation': `Translate the following text from ${task.fromLanguage} to ${task.toLanguage}:\n\n"${task.input}"`,
            'code-generation': `Generate ${task.language || 'Python'} code for: "${task.description}"\n\nRequirements: ${task.requirements || 'None'}`,
            'analysis': `Analyze the following data/text and provide insights:\n\n"${task.input}"\n\nFocus on: ${task.focus || 'general analysis'}`
        };

        return prompts[task.type] || `Please help with this task: "${task.description}"\n\nInput: ${task.input || 'None provided'}`;
    }

    getModelLoad(modelId) {
        const usage = this.activeModels.get(modelId);
        if (!usage) return 0;
        
        // Simple load calculation based on recent requests
        const now = Date.now();
        const recentRequests = usage.requests; // In a real system, track time-based windows
        return Math.min(recentRequests / 10, 5); // Scale 0-5
    }

    async getPerformanceStats() {
        const stats = {};
        
        for (const [modelId, usage] of this.activeModels) {
            stats[modelId] = {
                totalRequests: usage.requests,
                averageResponseTime: usage.requests > 0 ? usage.totalTime / usage.requests : 0,
                load: this.getModelLoad(modelId)
            };
        }
        
        return stats;
    }
}

// =============================================================================
// Example 2: Agent Orchestration with Fallback Chain
// =============================================================================

class AgentOrchestrator {
    constructor(registryUrl = 'http://localhost:3001') {
        this.registry = new AIRegistryClient(registryUrl);
        this.fallbackChains = new Map();
    }

    /**
     * Register an agent with fallback chain
     */
    async registerAgentWithFallbacks(agentInfo, fallbackChain = []) {
        // Register the agent
        const registration = await this.registry.registerAgent(agentInfo);
        
        // Store fallback chain
        this.fallbackChains.set(agentInfo.id, fallbackChain);
        
        console.log(`🤖 Registered agent ${agentInfo.name} with ${fallbackChain.length} fallbacks`);
        
        return registration;
    }

    /**
     * Execute task with automatic fallback
     */
    async executeWithFallback(agentId, task, maxRetries = 3) {
        const fallbackChain = this.fallbackChains.get(agentId) || [];
        const allOptions = [agentId, ...fallbackChain];
        
        for (let i = 0; i < allOptions.length && i < maxRetries; i++) {
            const currentOption = allOptions[i];
            
            try {
                console.log(`🔄 Attempt ${i + 1}: Using ${currentOption}`);
                
                if (i === 0) {
                    // Try primary agent
                    return await this.executeOnAgent(agentId, task);
                } else {
                    // Try fallback model
                    const model = await this.registry.discoverModel(task.type, {
                        provider: currentOption
                    });
                    
                    if (model) {
                        const client = await this.registry.createModelClient(model.id);
                        return await client.query(task.description);
                    }
                }
                
            } catch (error) {
                console.warn(`⚠️ Attempt ${i + 1} failed: ${error.message}`);
                
                if (i === allOptions.length - 1) {
                    throw new Error(`All fallback options exhausted. Last error: ${error.message}`);
                }
                
                // Wait before trying next option
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    async executeOnAgent(agentId, task) {
        // This would connect to the actual agent endpoint
        // For demo purposes, we'll simulate agent communication
        console.log(`📡 Executing task on agent ${agentId}`);
        
        // Simulate agent processing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return `Task completed by agent ${agentId}: ${task.description}`;
    }
}

// =============================================================================
// Example 3: Model Performance Benchmarking
// =============================================================================

class ModelBenchmark {
    constructor(registryUrl = 'http://localhost:3001') {
        this.registry = new AIRegistryClient(registryUrl);
        this.benchmarkResults = new Map();
    }

    /**
     * Run comprehensive benchmark on all models
     */
    async runFullBenchmark() {
        console.log('🏁 Starting comprehensive model benchmark...');
        
        const models = await this.registry.getAllModels();
        const testSuites = this.getTestSuites();
        
        for (const model of models) {
            console.log(`\n📊 Benchmarking ${model.name}...`);
            
            const modelResults = {
                modelId: model.id,
                name: model.name,
                provider: model.provider,
                tests: {},
                overallScore: 0,
                timestamp: new Date().toISOString()
            };

            for (const [testName, testConfig] of Object.entries(testSuites)) {
                try {
                    const result = await this.runBenchmarkTest(model, testConfig);
                    modelResults.tests[testName] = result;
                    console.log(`  ✅ ${testName}: ${result.score}/100`);
                } catch (error) {
                    console.log(`  ❌ ${testName}: Failed - ${error.message}`);
                    modelResults.tests[testName] = { score: 0, error: error.message };
                }
            }

            // Calculate overall score
            const scores = Object.values(modelResults.tests)
                .filter(t => t.score !== undefined)
                .map(t => t.score);
            
            modelResults.overallScore = scores.length > 0 ? 
                scores.reduce((a, b) => a + b, 0) / scores.length : 0;

            this.benchmarkResults.set(model.id, modelResults);
            
            console.log(`🏆 Overall score: ${modelResults.overallScore.toFixed(1)}/100`);
        }

        return this.generateBenchmarkReport();
    }

    getTestSuites() {
        return {
            'response_quality': {
                type: 'text-generation',
                prompt: 'Explain the concept of artificial intelligence in simple terms.',
                evaluation: 'quality',
                weight: 0.3
            },
            'response_speed': {
                type: 'text-generation',
                prompt: 'What is 2+2?',
                evaluation: 'speed',
                weight: 0.2,
                maxTime: 5000
            },
            'instruction_following': {
                type: 'text-generation',
                prompt: 'List exactly 3 benefits of renewable energy. Use bullet points.',
                evaluation: 'adherence',
                weight: 0.2
            },
            'reasoning': {
                type: 'text-generation',
                prompt: 'If a train travels 60 mph for 2 hours, how far does it go? Show your reasoning.',
                evaluation: 'logic',
                weight: 0.3
            }
        };
    }

    async runBenchmarkTest(model, testConfig) {
        const startTime = Date.now();
        
        try {
            const client = await this.registry.createModelClient(model.id);
            const response = await client.query(testConfig.prompt, {
                maxTokens: 200,
                temperature: 0.1 // Low temperature for consistency
            });
            
            const responseTime = Date.now() - startTime;
            
            // Evaluate based on test type
            let score = 0;
            
            switch (testConfig.evaluation) {
                case 'speed':
                    score = Math.max(0, 100 - (responseTime / testConfig.maxTime) * 100);
                    break;
                case 'quality':
                    score = this.evaluateResponseQuality(response);
                    break;
                case 'adherence':
                    score = this.evaluateInstructionFollowing(response, testConfig.prompt);
                    break;
                case 'logic':
                    score = this.evaluateReasoning(response);
                    break;
                default:
                    score = 50; // Default score
            }

            return {
                score: Math.round(score),
                responseTime: responseTime,
                response: response.substring(0, 200) + (response.length > 200 ? '...' : ''),
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            throw error;
        }
    }

    evaluateResponseQuality(response) {
        // Simple quality metrics
        let score = 50;
        
        // Length check (not too short, not too long)
        if (response.length > 100 && response.length < 500) score += 20;
        
        // Coherence check (simple heuristics)
        if (response.includes('artificial intelligence') || response.includes('AI')) score += 15;
        if (response.includes('.') && response.split('.').length > 2) score += 10; // Multiple sentences
        if (!/^[A-Z]/.test(response)) score -= 10; // Should start with capital
        
        return Math.min(100, Math.max(0, score));
    }

    evaluateInstructionFollowing(response, prompt) {
        let score = 50;
        
        if (prompt.includes('exactly 3') && (response.match(/•|·|-|\d\./g) || []).length >= 3) score += 30;
        if (prompt.includes('bullet points') && (response.includes('•') || response.includes('-'))) score += 20;
        
        return Math.min(100, Math.max(0, score));
    }

    evaluateReasoning(response) {
        let score = 50;
        
        // Check for correct answer (120 miles)
        if (response.includes('120')) score += 30;
        if (response.includes('60') && response.includes('2')) score += 10; // Shows the numbers
        if (response.includes('distance') || response.includes('miles') || response.includes('km')) score += 10;
        
        return Math.min(100, Math.max(0, score));
    }

    generateBenchmarkReport() {
        const results = Array.from(this.benchmarkResults.values());
        results.sort((a, b) => b.overallScore - a.overallScore);

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalModels: results.length,
                averageScore: results.reduce((sum, r) => sum + r.overallScore, 0) / results.length,
                topPerformer: results[0]?.name || 'None',
                topScore: results[0]?.overallScore || 0
            },
            rankings: results.map((r, index) => ({
                rank: index + 1,
                name: r.name,
                provider: r.provider,
                score: r.overallScore,
                strengths: this.identifyStrengths(r.tests),
                weaknesses: this.identifyWeaknesses(r.tests)
            })),
            detailedResults: results
        };

        return report;
    }

    identifyStrengths(tests) {
        return Object.entries(tests)
            .filter(([_, result]) => result.score > 75)
            .map(([testName, _]) => testName);
    }

    identifyWeaknesses(tests) {
        return Object.entries(tests)
            .filter(([_, result]) => result.score < 50)
            .map(([testName, _]) => testName);
    }
}

// =============================================================================
// Example 4: Real-world Usage Scenarios
// =============================================================================

async function demonstrateUsageScenarios() {
    console.log('🎭 Demonstrating real-world AI registry usage scenarios...\n');

    // Initialize components
    const distributor = new AITaskDistributor();
    const orchestrator = new AgentOrchestrator();
    const benchmark = new ModelBenchmark();
    const integrations = new ModelIntegrations();

    // Scenario 1: Automated task processing
    console.log('📝 Scenario 1: Multi-modal Content Creation Pipeline');
    try {
        const contentTasks = [
            {
                id: 'task-1',
                type: 'text-generation',
                description: 'Write a blog post about renewable energy',
                maxTokens: 800,
                maxLatency: 8000,
                startTime: Date.now()
            },
            {
                id: 'task-2',
                type: 'summarization',
                input: 'Renewable energy sources like solar and wind power are becoming increasingly important...',
                style: 'executive summary',
                startTime: Date.now()
            },
            {
                id: 'task-3',
                type: 'translation',
                input: 'Renewable energy is the future',
                fromLanguage: 'English',
                toLanguage: 'Spanish',
                startTime: Date.now()
            }
        ];

        for (const task of contentTasks) {
            try {
                const result = await distributor.routeTask(task);
                console.log(`✅ ${task.id}: ${result.result.substring(0, 100)}...`);
            } catch (error) {
                console.log(`❌ ${task.id}: ${error.message}`);
            }
        }
    } catch (error) {
        console.log('❌ Scenario 1 failed:', error.message);
    }

    console.log('\n🔄 Scenario 2: Agent Orchestration with Failover');
    try {
        // Register agent with fallback chain
        await orchestrator.registerAgentWithFallbacks({
            id: 'agent-primary',
            name: 'Primary Processing Agent',
            type: 'ultimate-agent',
            endpoint: 'http://localhost:8080'
        }, ['openai', 'anthropic', 'ollama']);

        // Execute task with automatic fallback
        const criticalTask = {
            type: 'analysis',
            description: 'Analyze quarterly sales data and provide recommendations',
            priority: 'high'
        };

        const result = await orchestrator.executeWithFallback('agent-primary', criticalTask);
        console.log(`✅ Task completed: ${result.substring(0, 100)}...`);
    } catch (error) {
        console.log('❌ Scenario 2 failed:', error.message);
    }

    console.log('\n📊 Scenario 3: Performance Monitoring and Optimization');
    try {
        // Get current performance stats
        const stats = await distributor.getPerformanceStats();
        console.log('Current model performance:', JSON.stringify(stats, null, 2));

        // Run mini benchmark on top models
        console.log('Running quick benchmark...');
        // In a real scenario, you'd run the full benchmark
        console.log('✅ Benchmark completed (simulated)');
    } catch (error) {
        console.log('❌ Scenario 3 failed:', error.message);
    }

    console.log('\n🔧 Scenario 4: Dynamic Model Registration');
    try {
        // Auto-discover and register local models
        console.log('Auto-registering available models...');
        await integrations.autoRegisterFromConfig();
        
        // Health check all models
        const healthResults = await integrations.healthCheckModels();
        console.log(`Health check results: ${healthResults.healthy.length} healthy, ${healthResults.unhealthy.length} unhealthy`);
    } catch (error) {
        console.log('❌ Scenario 4 failed:', error.message);
    }

    console.log('\n🎉 All scenarios demonstrated!');
}

// =============================================================================
// Example 5: Production Configuration
// =============================================================================

function createProductionConfig() {
    return {
        // Registry server configuration
        registry: {
            port: 3001,
            host: '0.0.0.0',
            ssl: {
                enabled: true,
                cert: '/path/to/ssl/cert.pem',
                key: '/path/to/ssl/key.pem'
            },
            cors: {
                origin: ['https://ai-dashboard.company.com', 'https://app.company.com'],
                credentials: true
            },
            rateLimit: {
                windowMs: 15 * 60 * 1000, // 15 minutes
                max: 1000 // limit each IP to 1000 requests per windowMs
            }
        },

        // Model configurations
        models: {
            openai: {
                apiKey: process.env.OPENAI_API_KEY,
                defaultModel: 'gpt-4',
                rateLimits: {
                    requestsPerMinute: 50,
                    tokensPerMinute: 150000
                }
            },
            anthropic: {
                apiKey: process.env.ANTHROPIC_API_KEY,
                defaultModel: 'claude-sonnet-4',
                rateLimits: {
                    requestsPerMinute: 30,
                    tokensPerMinute: 100000
                }
            },
            ollama: {
                endpoint: 'http://ollama-cluster.internal:11434',
                healthCheckInterval: 30000,
                models: ['llama2', 'codellama', 'mistral']
            }
        },

        // Monitoring configuration
        monitoring: {
            enabled: true,
            logLevel: 'info',
            metrics: {
                prometheus: {
                    enabled: true,
                    port: 9090
                },
                grafana: {
                    enabled: true,
                    dashboardUrl: 'https://grafana.company.com'
                }
            },
            alerts: {
                errorRateThreshold: 0.05, // 5%
                latencyThreshold: 5000, // 5 seconds
                emailRecipients: ['ops@company.com']
            }
        },

        // Security configuration
        security: {
            apiKeys: {
                enabled: true,
                adminKey: process.env.ADMIN_API_KEY
            },
            encryption: {
                enabled: true,
                algorithm: 'aes-256-gcm'
            }
        },

        // Database configuration
        database: {
            type: 'postgresql',
            host: process.env.DB_HOST,
            port: 5432,
            database: 'ai_registry',
            username: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            ssl: true,
            pool: {
                min: 2,
                max: 10
            }
        }
    };
}

// =============================================================================
// Export all examples
// =============================================================================

module.exports = {
    AITaskDistributor,
    AgentOrchestrator,
    ModelBenchmark,
    demonstrateUsageScenarios,
    createProductionConfig
};

// CLI interface for running examples
if (require.main === module) {
    const command = process.argv[2];

    switch (command) {
        case 'demo':
            demonstrateUsageScenarios().catch(console.error);
            break;

        case 'benchmark':
            const benchmark = new ModelBenchmark();
            benchmark.runFullBenchmark()
                .then(report => {
                    console.log('\n📊 Benchmark Report:');
                    console.log(JSON.stringify(report, null, 2));
                })
                .catch(console.error);
            break;

        case 'distribute':
            const distributor = new AITaskDistributor();
            const sampleTask = {
                id: 'cli-task',
                type: 'text-generation',
                description: process.argv[3] || 'Generate a creative story',
                startTime: Date.now()
            };
            
            distributor.routeTask(sampleTask)
                .then(result => {
                    console.log('✅ Task Result:', result);
                })
                .catch(console.error);
            break;

        case 'config':
            const config = createProductionConfig();
            console.log(JSON.stringify(config, null, 2));
            break;

        default:
            console.log(`
🎭 AI Registry Usage Examples

Commands:
  demo        Run all usage scenarios
  benchmark   Run model benchmark
  distribute  Distribute a sample task
  config      Show production configuration

Examples:
  node usage-examples.js demo
  node usage-examples.js benchmark
  node usage-examples.js distribute "Write a poem about AI"
  node usage-examples.js config > production-config.json
            `);
            break;
    }
}