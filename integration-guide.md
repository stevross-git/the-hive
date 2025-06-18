# AI Model Registry - Integration Guide

## 🚀 Quick Start

### 1. Installation

```bash
# Clone/download the registry files
mkdir ai-registry && cd ai-registry

# Create package.json (from artifact)
# Create ai-registry-server.js (from artifact)
# Create ai-registry-client.js (from artifact)
# Create public/dashboard.html (from artifact)

# Install dependencies
npm install

# Start the registry server
npm start
```

The registry will be available at:
- **API**: http://localhost:3001
- **Dashboard**: http://localhost:3001/dashboard.html
- **WebSocket**: ws://localhost:3001

### 2. Docker Deployment (Recommended)

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY ai-registry-server.js ./
COPY ai-registry-client.js ./
COPY public/ ./public/

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  ai-registry:
    build: .
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data
      - ./ai-registry-data.json:/app/ai-registry-data.json
    environment:
      - NODE_ENV=production
      - PORT=3001
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Optional: Redis for scaling (future enhancement)
  # redis:
  #   image: redis:alpine
  #   ports:
  #     - "6379:6379"
  #   restart: unless-stopped
```

Deploy with Docker:
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f ai-registry

# Stop
docker-compose down
```

## 🔗 Integration with Ultimate Agent

### 1. Add Registry Client to Ultimate Agent

Update your Ultimate Agent's `package.json`:
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "ws": "^8.14.2"
  }
}
```

### 2. Create Registry Integration Module

Add to `ultimate_agent/ai/registry_integration.py`:

```python
#!/usr/bin/env python3
"""
AI Registry Integration for Ultimate Agent
Connects the agent to the AI Model Registry for model discovery
"""

import asyncio
import aiohttp
import json
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

@dataclass
class AIModelInfo:
    id: str
    name: str
    type: str
    provider: str
    endpoint: str
    capabilities: List[str]
    communication_schema: Dict[str, Any]

class RegistryClient:
    def __init__(self, registry_url: str = "http://localhost:3001"):
        self.registry_url = registry_url.rstrip('/')
        self.session = None
        self.logger = logging.getLogger(__name__)
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def register_agent(self, agent_info: Dict[str, Any]) -> bool:
        """Register this agent with the registry"""
        try:
            async with self.session.post(
                f"{self.registry_url}/api/agents/register",
                json=agent_info
            ) as response:
                result = await response.json()
                if result.get('success'):
                    self.logger.info(f"✅ Agent registered: {agent_info.get('name')}")
                    return True
                else:
                    self.logger.error(f"❌ Registration failed: {result.get('error')}")
                    return False
        except Exception as e:
            self.logger.error(f"❌ Registration error: {str(e)}")
            return False
    
    async def find_models(self, criteria: Dict[str, Any] = None) -> List[AIModelInfo]:
        """Find models matching criteria"""
        try:
            if criteria is None:
                # Get all models
                async with self.session.get(f"{self.registry_url}/api/models") as response:
                    data = await response.json()
                    models_data = data.get('models', [])
            else:
                # Search with criteria
                async with self.session.post(
                    f"{self.registry_url}/api/models/find",
                    json=criteria
                ) as response:
                    data = await response.json()
                    models_data = data.get('models', [])
            
            models = []
            for model_data in models_data:
                models.append(AIModelInfo(
                    id=model_data['id'],
                    name=model_data['name'],
                    type=model_data['type'],
                    provider=model_data['provider'],
                    endpoint=model_data['endpoint'],
                    capabilities=model_data.get('capabilities', []),
                    communication_schema=model_data.get('communicationSchema', {})
                ))
            
            return models
            
        except Exception as e:
            self.logger.error(f"❌ Error finding models: {str(e)}")
            return []
    
    async def get_model_communication(self, model_id: str) -> Optional[Dict[str, Any]]:
        """Get communication details for a model"""
        try:
            async with self.session.get(
                f"{self.registry_url}/api/models/{model_id}/communication"
            ) as response:
                data = await response.json()
                return data.get('communication')
        except Exception as e:
            self.logger.error(f"❌ Error getting model communication: {str(e)}")
            return None

# Integration with existing Ultimate Agent
class UltimateAgentRegistryIntegration:
    def __init__(self, agent_instance, registry_url: str = "http://localhost:3001"):
        self.agent = agent_instance
        self.registry_url = registry_url
        self.registry_client = None
        self.registered_models = {}
        
    async def initialize(self):
        """Initialize registry integration"""
        self.registry_client = RegistryClient(self.registry_url)
        await self.registry_client.__aenter__()
        
        # Register this agent
        agent_info = {
            'name': f"ultimate-agent-{self.agent.agent_id}",
            'type': 'ultimate-agent',
            'endpoint': f"http://localhost:{self.agent.dashboard_port}",
            'capabilities': [
                'ai-training',
                'blockchain',
                'task-scheduling',
                'data-processing'
            ],
            'availableModels': list(self.agent.ai_manager.models.keys()) if hasattr(self.agent, 'ai_manager') else [],
            'dashboardPort': self.agent.dashboard_port,
            'nodeUrl': self.agent.node_url
        }
        
        await self.registry_client.register_agent(agent_info)
        
        # Register local models with the registry
        await self.register_local_models()
    
    async def register_local_models(self):
        """Register local AI models with the registry"""
        if not hasattr(self.agent, 'ai_manager'):
            return
            
        for model_name, model_info in self.agent.ai_manager.models.items():
            model_data = {
                'name': model_name,
                'type': model_info.get('type', 'llm'),
                'provider': 'local',
                'endpoint': f"http://localhost:{self.agent.dashboard_port}/api/ai/{model_name}",
                'description': f"Local model on Ultimate Agent {self.agent.agent_id}",
                'capabilities': model_info.get('capabilities', ['text-generation']),
                'communicationSchema': {
                    'requestFormat': 'ultimate-agent',
                    'responseFormat': 'ultimate-agent',
                    'authMethod': 'none'
                },
                'registeredBy': f"ultimate-agent-{self.agent.agent_id}"
            }
            
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"{self.registry_url}/api/models/register",
                        json=model_data
                    ) as response:
                        result = await response.json()
                        if result.get('success'):
                            print(f"✅ Registered model: {model_name}")
                            self.registered_models[model_name] = result['model']['id']
            except Exception as e:
                print(f"❌ Failed to register model {model_name}: {str(e)}")
    
    async def discover_external_models(self, task_type: str = None) -> List[AIModelInfo]:
        """Discover external AI models for delegation"""
        criteria = {}
        if task_type:
            criteria['capability'] = task_type
            
        # Find models not from this agent
        criteria['registeredBy'] = {'$ne': f"ultimate-agent-{self.agent.agent_id}"}
        
        return await self.registry_client.find_models(criteria)
    
    async def delegate_to_external_model(self, model_id: str, prompt: str) -> Optional[str]:
        """Delegate a task to an external model"""
        communication = await self.registry_client.get_model_communication(model_id)
        if not communication:
            return None
            
        # Use the JavaScript client's logic adapted for Python
        # This would need to be implemented based on the model's communication schema
        return await self._communicate_with_model(communication, prompt)
    
    async def _communicate_with_model(self, communication: Dict[str, Any], prompt: str) -> Optional[str]:
        """Communicate with external model using its schema"""
        try:
            schema = communication.get('communicationSchema', {})
            endpoint = communication.get('endpoint')
            
            # Build request based on schema
            if schema.get('requestFormat') == 'openai-compatible':
                request_data = {
                    'model': communication.get('name'),
                    'messages': [{'role': 'user', 'content': prompt}],
                    'max_tokens': 150
                }
                endpoint_path = '/v1/chat/completions'
            elif schema.get('requestFormat') == 'ollama':
                request_data = {
                    'model': communication.get('name'),
                    'prompt': prompt,
                    'stream': False
                }
                endpoint_path = '/api/generate'
            else:
                # Default format
                request_data = {'prompt': prompt}
                endpoint_path = '/'
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{endpoint}{endpoint_path}",
                    json=request_data
                ) as response:
                    result = await response.json()
                    
                    # Parse response based on schema
                    if schema.get('responseFormat') == 'openai-compatible':
                        return result.get('choices', [{}])[0].get('message', {}).get('content')
                    elif schema.get('responseFormat') == 'ollama':
                        return result.get('response')
                    else:
                        return result.get('text', str(result))
                        
        except Exception as e:
            print(f"❌ Error communicating with model: {str(e)}")
            return None
    
    async def cleanup(self):
        """Cleanup registry integration"""
        if self.registry_client:
            await self.registry_client.__aexit__(None, None, None)

# Add to Ultimate Agent initialization
def integrate_registry(agent_instance, registry_url: str = "http://localhost:3001"):
    """Add registry integration to Ultimate Agent"""
    integration = UltimateAgentRegistryIntegration(agent_instance, registry_url)
    
    # Add as async task
    async def init_registry():
        await integration.initialize()
    
    # Schedule initialization
    asyncio.create_task(init_registry())
    
    # Add methods to agent
    agent_instance.registry_integration = integration
    agent_instance.discover_models = integration.discover_external_models
    agent_instance.delegate_task = integration.delegate_to_external_model
    
    return integration
```

### 3. Update Ultimate Agent Main

In your `ultimate_agent/core/agent.py`, add:

```python
# Import the registry integration
from ai.registry_integration import integrate_registry

class UltimatePainNetworkAgent:
    def __init__(self, node_url=None, dashboard_port=8080):
        # ... existing initialization ...
        
        # Initialize registry integration
        if node_url:  # Only if connected to network
            self.registry_integration = integrate_registry(self)
    
    async def enhanced_task_delegation(self, task_description: str, task_type: str = None):
        """Enhanced task delegation using registry"""
        if hasattr(self, 'registry_integration'):
            # First, try to find suitable external models
            external_models = await self.discover_models(task_type)
            
            if external_models:
                print(f"🔍 Found {len(external_models)} external models for {task_type}")
                
                # Try the best model first
                best_model = external_models[0]
                result = await self.delegate_task(best_model.id, task_description)
                
                if result:
                    print(f"✅ Task delegated to {best_model.name}: {result}")
                    return result
            
        # Fallback to local processing
        return await self.process_task_locally(task_description)
```

## 📊 Usage Examples

### 1. Basic Model Discovery

```javascript
const { AIRegistryClient } = require('./ai-registry-client');

const client = new AIRegistryClient('http://localhost:3001');

// Find all LLM models
const llmModels = await client.findModels({ type: 'llm' });
console.log('Available LLM models:', llmModels.length);

// Find fast, reliable models
const fastModels = await client.findModels({
    maxLatency: 2000,
    minReliability: 0.95
});

// Get the best model for text generation
const bestModel = await client.discoverModel('text-generation');
if (bestModel) {
    const modelClient = await client.createModelClient(bestModel.id);
    const response = await modelClient.query('Explain quantum computing');
    console.log('Response:', response);
}
```

### 2. Manual Model Registration

Use the dashboard at `http://localhost:3001/dashboard.html` or API:

```bash
# Register OpenAI GPT-4
curl -X POST http://localhost:3001/api/models/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gpt-4",
    "type": "llm",
    "provider": "openai",
    "endpoint": "https://api.openai.com",
    "apiKey": "sk-your-key-here",
    "description": "OpenAI GPT-4 model",
    "capabilities": ["text-generation", "reasoning", "code-generation"]
  }'

# Register local Ollama model
curl -X POST http://localhost:3001/api/models/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "llama2",
    "type": "llm", 
    "provider": "ollama",
    "endpoint": "http://localhost:11434",
    "description": "Local Llama2 model via Ollama"
  }'

# Register Claude (you!)
curl -X POST http://localhost:3001/api/models/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "claude-sonnet-4",
    "type": "llm",
    "provider": "anthropic", 
    "endpoint": "https://api.anthropic.com",
    "apiKey": "your-key-here",
    "description": "Anthropic Claude Sonnet 4",
    "capabilities": ["text-generation", "analysis", "reasoning", "code-generation"]
  }'
```

## 🔧 Configuration

### Environment Variables

```bash
# Registry server configuration
PORT=3001
NODE_ENV=production
REGISTRY_DATA_FILE=./ai-registry-data.json

# Ultimate Agent integration
REGISTRY_URL=http://localhost:3001
AUTO_REGISTER_MODELS=true
HEARTBEAT_INTERVAL=30000
```

### Configuration File

Create `config.json`:
```json
{
  "registry": {
    "url": "http://localhost:3001",
    "autoRegister": true,
    "heartbeatInterval": 30000,
    "cacheTimeout": 300000
  },
  "models": {
    "autoDiscover": true,
    "preferLocal": true,
    "maxLatency": 5000,
    "minReliability": 0.8
  },
  "agents": {
    "capabilities": [
      "text-processing",
      "data-analysis", 
      "task-scheduling"
    ]
  }
}
```

## 🚀 Production Deployment

### 1. Load Balancer Setup (Nginx)

```nginx
upstream ai_registry {
    server localhost:3001;
    # Add more instances for scaling
    # server localhost:3002;
    # server localhost:3003;
}

server {
    listen 80;
    server_name ai-registry.yourdomain.com;
    
    location / {
        proxy_pass http://ai_registry;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. SSL/HTTPS

```bash
# Get SSL certificate (Let's Encrypt)
certbot --nginx -d ai-registry.yourdomain.com
```

### 3. Monitoring

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## 🔍 Troubleshooting

### Common Issues

1. **Connection refused**: Check if registry server is running on port 3001
2. **Models not found**: Verify models are registered in the registry
3. **Authentication failed**: Check API keys in model configurations
4. **WebSocket connection failed**: Ensure firewall allows WebSocket connections

### Debug Mode

```bash
# Enable debug logging
DEBUG=* npm start

# Or with Docker
docker-compose up -d && docker-compose logs -f ai-registry
```

## 🎯 Next Steps

1. **Scale the registry** with Redis for caching and clustering
2. **Add authentication** for production security
3. **Implement model health monitoring** with automatic failover
4. **Add model performance metrics** and auto-scaling
5. **Create SDKs** for Python, Go, and other languages
6. **Add model versioning** and deployment management

This registry system will serve as the "DNS for AI" in your Ultimate Agent network, enabling intelligent model discovery and seamless AI-to-AI communication!