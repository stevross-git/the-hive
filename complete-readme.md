# 🧠 AI Model Registry - Complete System

**A DNS-like registry for AI models and communication protocols**

Transform your AI infrastructure into an intelligent, self-organizing network where AI agents can discover, communicate with, and delegate tasks to other AI models seamlessly. This is the "DNS for AI" that enables true AI-to-AI communication.

## 🎯 What This System Does

- **🔍 Model Discovery**: Find AI models by capabilities, performance, cost, and availability
- **🔌 Protocol Translation**: Automatically handle communication between different AI providers (OpenAI, Anthropic, Ollama, etc.)
- **⚡ Load Balancing**: Intelligently distribute tasks across multiple models based on load and performance
- **🔄 Automatic Failover**: Seamlessly switch to backup models when primary models fail
- **📊 Performance Monitoring**: Track usage, latency, costs, and reliability across all models
- **🤖 Agent Integration**: Connect your Ultimate Agent network for distributed AI processing
- **📈 Analytics & Optimization**: Benchmark models and optimize task routing

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   AI Agents     │    │  AI Registry    │    │   AI Models     │
│                 │    │                 │    │                 │
│ • Ultimate Agent│◄──►│ • Discovery     │◄──►│ • OpenAI GPT-4  │
│ • Custom Agents │    │ • Load Balancing│    │ • Claude Sonnet │
│ • Microservices │    │ • Monitoring    │    │ • Local Ollama  │
│                 │    │ • Analytics     │    │ • Custom Models │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                       ▲                       ▲
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────────────┐
                    │    Dashboard & APIs     │
                    │                         │
                    │ • Web Interface         │
                    │ • REST APIs             │
                    │ • WebSocket Updates     │
                    │ • Prometheus Metrics    │
                    └─────────────────────────┘
```

## 📦 Components Overview

### Core Components

1. **[AI Registry Server](ai-registry-server.js)** - Central coordination service
2. **[Client Library](ai-registry-client.js)** - Easy integration for agents
3. **[Web Dashboard](public/dashboard.html)** - Management interface
4. **[Model Integrations](model-integrations.js)** - Pre-built connectors
5. **[Monitoring System](registry-monitor.js)** - Analytics and performance tracking
6. **[Usage Examples](usage-examples.js)** - Real-world scenarios and patterns

### Integration Files

- **[Setup Script](setup.sh)** - Automated installation
- **[Docker Configuration](docker-compose.yml)** - Container deployment
- **[Integration Guide](integration-guide.md)** - Connection instructions

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Download and run the setup script
curl -sSL https://your-domain.com/setup.sh | bash

# Or manually:
chmod +x setup-script.sh
./setup-script.sh
```

### Option 2: Manual Setup

```bash
# Create project directory
mkdir ai-registry && cd ai-registry

# Copy all the artifacts from Claude's responses:
# - ai-registry-server.js
# - ai-registry-client.js  
# - public/dashboard.html
# - model-integrations.js
# - registry-monitor.js
# - usage-examples.js
# - package.json

# Install dependencies
npm install

# Start the registry
npm start
```

### Option 3: Docker Deployment

```bash
# Using Docker Compose (recommended for production)
docker-compose up -d

# Or build manually
docker build -t ai-registry .
docker run -p 3001:3001 ai-registry
```

## 🎮 Getting Started Guide

### 1. Start the Registry

```bash
cd ai-registry
npm start
```

The registry will be available at:
- **API**: http://localhost:3001
- **Dashboard**: http://localhost:3001/dashboard.html
- **Health**: http://localhost:3001/health
- **Metrics**: http://localhost:3001/metrics

### 2. Register Your First Models

#### Option A: Use the Web Dashboard
1. Open http://localhost:3001/dashboard.html
2. Click "Add New Model"
3. Fill in model details (use the preset buttons for common models)
4. Click "Add Model"

#### Option B: Use the API
```bash
# Register OpenAI GPT-4
curl -X POST http://localhost:3001/api/models/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gpt-4",
    "type": "llm",
    "provider": "openai",
    "endpoint": "https://api.openai.com",
    "apiKey": "your-openai-key",
    "description": "OpenAI GPT-4 model"
  }'

# Register local Ollama model
curl -X POST http://localhost:3001/api/models/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "llama2",
    "type": "llm",
    "provider": "ollama", 
    "endpoint": "http://localhost:11434",
    "description": "Local Llama2 model"
  }'
```

#### Option C: Auto-register from Configuration
```bash
# Create model-config.json with your API keys
node model-integrations.js auto-register

# Or register specific providers
node model-integrations.js register-openai your-openai-key
node model-integrations.js register-anthropic your-anthropic-key
node model-integrations.js register-ollama http://localhost:11434
```

### 3. Connect Your AI Agent

```javascript
const { AIRegistryClient } = require('./ai-registry-client');

// Initialize client
const registry = new AIRegistryClient('http://localhost:3001');

// Register your agent
await registry.registerAgent({
    name: 'my-ai-agent',
    type: 'ultimate-agent',
    endpoint: 'http://localhost:8080',
    capabilities: ['text-processing', 'data-analysis']
});

// Find a model for text generation
const model = await registry.discoverModel('text-generation', {
    maxLatency: 5000,
    minReliability: 0.9
});

if (model) {
    // Create client and query the model
    const modelClient = await registry.createModelClient(model.id);
    const response = await modelClient.query('Hello, how can you help me?');
    console.log('Response:', response);
}
```

## 🔧 Integration with Ultimate Agent

### Add to Your Ultimate Agent

1. **Install the registry integration module** (see Integration Guide)

2. **Update your agent configuration**:
```python
# In ultimate_agent/core/agent.py
from ai.registry_integration import integrate_registry

class UltimatePainNetworkAgent:
    def __init__(self, node_url=None, dashboard_port=8080):
        # ... existing initialization ...
        
        # Add registry integration
        if node_url:
            self.registry_integration = integrate_registry(self)
```

3. **Use enhanced task delegation**:
```python
# Enhanced task delegation using the registry
async def process_complex_task(self, task_description):
    # Try to find external models that can help
    external_models = await self.discover_models('text-generation')
    
    if external_models:
        # Delegate to the best external model
        result = await self.delegate_task(external_models[0].id, task_description)
        if result:
            return result
    
    # Fallback to local processing
    return await self.process_locally(task_description)
```

## 📊 Real-World Usage Examples

### 1. Multi-Agent Task Distribution

```javascript
const { AITaskDistributor } = require('./usage-examples');

const distributor = new AITaskDistributor();

// Route tasks to optimal models
const tasks = [
    { type: 'text-generation', description: 'Write a blog post about AI' },
    { type: 'code-generation', description: 'Create a Python web scraper' },
    { type: 'analysis', description: 'Analyze sales data trends' }
];

for (const task of tasks) {
    const result = await distributor.routeTask(task);
    console.log(`Task completed by ${result.modelUsed}`);
}
```

### 2. Intelligent Failover Chain

```javascript
const { AgentOrchestrator } = require('./usage-examples');

const orchestrator = new AgentOrchestrator();

// Register agent with fallback chain
await orchestrator.registerAgentWithFallbacks({
    id: 'primary-agent',
    name: 'Main Processing Agent'
}, ['openai', 'anthropic', 'ollama']); // Fallback order

// Execute with automatic failover
const result = await orchestrator.executeWithFallback(
    'primary-agent', 
    { type: 'analysis', description: 'Critical business analysis' }
);
```

### 3. Performance Benchmarking

```javascript
const { ModelBenchmark } = require('./usage-examples');

const benchmark = new ModelBenchmark();

// Run comprehensive benchmark
const report = await benchmark.runFullBenchmark();

console.log(`Top performer: ${report.summary.topPerformer}`);
console.log(`Average score: ${report.summary.averageScore}`);
```

### 4. Health Monitoring

```bash
# Check health of all registered models
node model-integrations.js health-check

# View real-time performance metrics
node registry-monitor.js status

# Generate daily performance report
node registry-monitor.js report > daily-report.json
```

## 🎛️ Dashboard Features

Access the web dashboard at http://localhost:3001/dashboard.html

### Features:
- **📊 Real-time Statistics**: Live model and agent counts
- **🔍 Model Discovery**: Search and filter models by capabilities
- **➕ Easy Registration**: Add models with preset configurations
- **📈 Performance Metrics**: Response times, success rates, usage stats
- **🔄 Live Updates**: WebSocket-powered real-time updates
- **🎨 Modern UI**: Beautiful, responsive interface

### Dashboard Screenshots:
- Registry overview with statistics
- Model registration form with presets
- Real-time model performance graphs
- Agent activity monitoring

## 📡 API Reference

### Core Endpoints

```bash
# Registry Information
GET /api/info                 # Registry information and stats
GET /health                   # Health check endpoint
GET /api/stats               # Detailed statistics

# Model Management
POST /api/models/register     # Register a new model
GET /api/models              # List all models
POST /api/models/find        # Find models by criteria
GET /api/models/:id          # Get specific model
GET /api/models/:id/communication  # Get communication details
PUT /api/models/:id          # Update model
DELETE /api/models/:id       # Remove model

# Agent Management  
POST /api/agents/register    # Register an agent
GET /api/agents             # List all agents
PUT /api/agents/:id         # Update agent status

# Monitoring
GET /metrics                # Prometheus metrics
```

### Example Queries

```bash
# Find all LLM models with low latency
curl -X POST http://localhost:3001/api/models/find \
  -H "Content-Type: application/json" \
  -d '{
    "type": "llm",
    "maxLatency": 3000,
    "minReliability": 0.9
  }'

# Get communication details for a model
curl http://localhost:3001/api/models/model-id-here/communication
```

## 🔍 Monitoring & Analytics

### Built-in Monitoring

The registry includes comprehensive monitoring:

- **📊 Request Tracking**: All API calls with response times
- **🎯 Model Usage**: Per-model usage statistics and performance
- **🤖 Agent Activity**: Agent registration and heartbeat tracking
- **💾 System Metrics**: Memory, CPU, and error rate monitoring
- **📈 Performance Analytics**: Percentiles, trends, and optimization insights

### Prometheus Integration

Access metrics at `/metrics` endpoint:
```bash
curl http://localhost:3001/metrics
```

Sample metrics:
```
registry_requests_total 1247
registry_models_active 12
registry_agents_total 5
registry_response_time_avg 245.7
```

### Log Files

Logs are stored in the `./logs` directory:
- `access.log` - All API requests
- `errors.log` - Error tracking
- `metrics.json` - Performance metrics

## 🔒 Security Features

### API Security
- Rate limiting (configurable per IP)
- CORS protection
- Request validation
- Optional API key authentication

### Data Protection  
- No sensitive data logged
- API keys are masked in responses
- Configurable SSL/TLS encryption
- Secure WebSocket connections

### Production Security
```javascript
// Enable authentication
const config = {
    security: {
        apiKeys: {
            enabled: true,
            adminKey: process.env.ADMIN_API_KEY
        }
    }
};
```

## 🚀 Production Deployment

### Docker Compose (Recommended)

```yaml
version: '3.8'
services:
  ai-registry:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    
  # Optional: Redis for scaling
  redis:
    image: redis:alpine
    restart: unless-stopped
    
  # Optional: PostgreSQL for production database
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: ai_registry
      POSTGRES_USER: registry
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### Load Balancer (Nginx)

```nginx
upstream ai_registry {
    server localhost:3001;
    server localhost:3002;  # Additional instances
}

server {
    listen 443 ssl;
    server_name ai-registry.yourdomain.com;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    
    location / {
        proxy_pass http://ai_registry;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Environment Configuration

```bash
# Production environment variables
NODE_ENV=production
PORT=3001
REGISTRY_DATA_FILE=/app/data/registry.json

# Database (optional)
DB_TYPE=postgresql
DB_HOST=postgres
DB_PORT=5432
DB_NAME=ai_registry
DB_USER=registry
DB_PASSWORD=your-secure-password

# Security
ADMIN_API_KEY=your-admin-key
JWT_SECRET=your-jwt-secret

# External service API keys
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_URL=https://grafana.yourdomain.com
```

## 🛠️ Development

### Development Setup

```bash
# Clone and setup
git clone https://github.com/your-org/ai-registry.git
cd ai-registry

# Install dependencies
npm install

# Start in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

### Adding New Model Providers

1. **Extend the ModelIntegrations class**:
```javascript
// In model-integrations.js
async registerCustomProvider(apiKey, models) {
    // Implementation for new provider
}
```

2. **Add communication schema**:
```javascript
// Define how to communicate with the new provider
const communicationSchema = {
    requestFormat: 'custom-provider',
    responseFormat: 'custom-provider',
    authMethod: 'api-key'
};
```

3. **Update the client library**:
```javascript
// Add support in ModelClient class
parseResponse(response) {
    if (this.schema.responseFormat === 'custom-provider') {
        return response.customField;
    }
    // ... existing logic
}
```

### Custom Agent Integration

```python
# Python example for custom agents
class CustomAgent:
    def __init__(self, registry_url):
        self.registry = RegistryClient(registry_url)
    
    async def process_task(self, task):
        # Find suitable model
        models = await self.registry.find_models({
            'capability': task.type,
            'maxLatency': 5000
        })
        
        if models:
            # Use the best model
            result = await self.delegate_to_model(models[0], task)
            return result
        
        # Fallback to local processing
        return self.process_locally(task)
```

## 🔧 Troubleshooting

### Common Issues

1. **"Connection refused" errors**
   ```bash
   # Check if registry is running
   curl http://localhost:3001/health
   
   # Check logs
   docker-compose logs ai-registry
   ```

2. **Models not being discovered**
   ```bash
   # Verify model registration
   curl http://localhost:3001/api/models
   
   # Check model health
   node model-integrations.js health-check
   ```

3. **WebSocket connection issues**
   ```bash
   # Check firewall settings
   # Ensure port 3001 is accessible
   # Verify CORS configuration
   ```

4. **High latency or timeouts**
   ```bash
   # Check model performance
   node usage-examples.js benchmark
   
   # Monitor system metrics
   node registry-monitor.js status
   ```

### Debug Mode

```bash
# Enable detailed logging
DEBUG=* npm start

# Or set log level
LOG_LEVEL=debug npm start
```

### Performance Optimization

1. **Enable caching** (Redis):
```javascript
const redis = require('redis');
const client = redis.createClient();
// Use Redis for model discovery caching
```

2. **Use connection pooling**:
```javascript
// Already implemented in the client library
// Adjust pool settings in production
```

3. **Enable compression**:
```javascript
app.use(compression());
```

## 📈 Metrics & KPIs

### Key Performance Indicators

- **Model Discovery Time**: < 100ms average
- **Task Routing Time**: < 200ms average  
- **System Uptime**: > 99.9%
- **Error Rate**: < 1%
- **Model Response Time**: Provider-dependent
- **Agent Registration Success**: > 99%

### Monitoring Dashboard

Create Grafana dashboards to monitor:
- Request volume and response times
- Model usage and performance
- Error rates and system health
- Agent activity and connectivity
- Resource utilization

## 🤝 Contributing

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to the branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure all tests pass
- Add examples for new functionality

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by DNS and service discovery patterns
- Built for the Ultimate Agent ecosystem
- Designed for AI-to-AI communication
- Community-driven development

## 📞 Support

- **Issues**: GitHub Issues
- **Documentation**: This README and integration guides
- **Community**: Discord/Slack channels
- **Commercial Support**: Available for enterprise deployments

---

## 🎯 Next Steps

Now that you have the complete AI Registry system:

1. **Set up the registry** using the automated setup script
2. **Register your AI models** using the dashboard or API
3. **Connect your Ultimate Agent** using the integration guide
4. **Monitor performance** with the built-in analytics
5. **Scale your deployment** using Docker and load balancers

This system transforms your AI infrastructure into an intelligent, self-organizing network where AI agents can seamlessly discover and communicate with each other. Welcome to the future of AI-to-AI communication! 🚀

---

**Made with ❤️ for the AI agent community**