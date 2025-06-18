#!/bin/bash

# AI Model Registry - Automated Setup Script
# This script sets up the complete AI registry system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGISTRY_DIR="ai-model-registry"
REGISTRY_PORT="3001"
DOCKER_COMPOSE_VERSION="3.8"

echo -e "${BLUE}"
echo "🧠 AI Model Registry Setup"
echo "=========================="
echo -e "${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if directory already exists
if [ -d "$REGISTRY_DIR" ]; then
    print_warning "Directory $REGISTRY_DIR already exists!"
    read -p "Do you want to continue and overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 1
    fi
    rm -rf "$REGISTRY_DIR"
fi

# Create directory structure
print_status "Creating directory structure..."
mkdir -p "$REGISTRY_DIR"
cd "$REGISTRY_DIR"
mkdir -p public data logs

# Create package.json
print_status "Creating package.json..."
cat > package.json << 'EOF'
{
  "name": "ai-model-registry",
  "version": "1.0.0",
  "description": "DNS-like registry for AI models and communication protocols",
  "main": "ai-registry-server.js",
  "scripts": {
    "start": "node ai-registry-server.js",
    "dev": "nodemon ai-registry-server.js",
    "test": "jest",
    "docker:build": "docker build -t ai-registry .",
    "docker:run": "docker run -p 3001:3001 ai-registry"
  },
  "keywords": [
    "ai",
    "registry",
    "dns",
    "models",
    "discovery",
    "api",
    "agents"
  ],
  "author": "Ultimate Agent Network",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "uuid": "^9.0.0",
    "ws": "^8.14.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.7.0"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
EOF

# Create the main server file (this would need the actual content from the artifacts)
print_status "Creating AI registry server..."
cat > ai-registry-server.js << 'EOF'
#!/usr/bin/env node

/**
 * AI Model Registry Server
 * A DNS-like registry for AI models and their communication protocols
 * NOTE: This is a placeholder - copy the full content from the artifacts
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Placeholder - implement the full registry from artifacts
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.json({ 
        message: 'AI Model Registry',
        status: 'Please copy the full server code from the artifacts'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 AI Model Registry (placeholder) running on port ${PORT}`);
    console.log('📝 Please copy the full server code from the artifacts');
});
EOF

# Create client library
print_status "Creating client library..."
cat > ai-registry-client.js << 'EOF'
/**
 * AI Registry Client Library
 * NOTE: This is a placeholder - copy the full content from the artifacts
 */

class AIRegistryClient {
    constructor(registryUrl = 'http://localhost:3001') {
        this.registryUrl = registryUrl.replace(/\/$/, '');
        console.log('AI Registry Client initialized');
        console.log('📝 Please copy the full client code from the artifacts');
    }
    
    async findModels(criteria = {}) {
        console.log('📝 Please implement the full client from artifacts');
        return [];
    }
}

module.exports = { AIRegistryClient };
EOF

# Create dashboard HTML
print_status "Creating dashboard..."
cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>AI Model Registry</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 30px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .placeholder {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 20px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧠 AI Model Registry</h1>
        <p>Centralized directory for AI model discovery and communication</p>
    </div>
    
    <div class="placeholder">
        <h3>⚠️ Setup Required</h3>
        <p>This is a placeholder dashboard. Please copy the full HTML content from the artifacts to enable the complete dashboard functionality.</p>
        <p>The dashboard should include:</p>
        <ul>
            <li>Model registration form</li>
            <li>Model discovery interface</li>
            <li>Real-time statistics</li>
            <li>WebSocket integration</li>
        </ul>
    </div>
    
    <script>
        console.log('📝 AI Registry Dashboard - Please copy full HTML from artifacts');
    </script>
</body>
</html>
EOF

# Create Dockerfile
print_status "Creating Dockerfile..."
cat > Dockerfile << 'EOF'
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
EOF

# Create docker-compose.yml
print_status "Creating docker-compose.yml..."
cat > docker-compose.yml << EOF
version: '$DOCKER_COMPOSE_VERSION'

services:
  ai-registry:
    build: .
    ports:
      - "$REGISTRY_PORT:3001"
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

  # Optional: Add Redis for scaling (uncomment if needed)
  # redis:
  #   image: redis:alpine
  #   ports:
  #     - "6379:6379"
  #   restart: unless-stopped
EOF

# Create environment file
print_status "Creating environment configuration..."
cat > .env << EOF
# AI Model Registry Configuration
PORT=$REGISTRY_PORT
NODE_ENV=development
REGISTRY_DATA_FILE=./ai-registry-data.json

# Security (set these in production)
# JWT_SECRET=your-jwt-secret-here
# API_KEY=your-api-key-here

# Ultimate Agent Integration
REGISTRY_URL=http://localhost:$REGISTRY_PORT
AUTO_REGISTER_MODELS=true
HEARTBEAT_INTERVAL=30000
EOF

# Create .gitignore
print_status "Creating .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Data files
ai-registry-data.json
data/
logs/

# Environment variables
.env.local
.env.production
.env.development.local

# Docker
.docker/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
EOF

# Create README
print_status "Creating README..."
cat > README.md << 'EOF'
# AI Model Registry

A DNS-like registry for AI models and their communication protocols, designed to work with the Ultimate Agent network.

## Quick Start

### Development
```bash
# Install dependencies
npm install

# Start the server
npm start

# Access dashboard
open http://localhost:3001
```

### Docker
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f ai-registry

# Stop
docker-compose down
```

## Features

- 🔍 **Model Discovery**: Find AI models by capabilities, type, provider
- 🔌 **Protocol Translation**: Automatic communication schema handling
- 📊 **Real-time Dashboard**: Web interface for manual management
- 🔗 **Agent Integration**: Seamless Ultimate Agent network integration
- 📡 **WebSocket Updates**: Real-time registry updates
- 🐳 **Docker Ready**: Easy deployment and scaling

## API Endpoints

- `GET /api/models` - List all models
- `POST /api/models/register` - Register new model
- `POST /api/models/find` - Find models by criteria
- `GET /api/models/:id/communication` - Get model communication details
- `POST /api/agents/register` - Register agent
- `GET /api/stats` - Registry statistics

## Configuration

Copy `.env.example` to `.env` and configure:

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `REGISTRY_DATA_FILE` - Data storage file path

## Integration

See the integration guide for connecting with Ultimate Agent networks.

## License

MIT License - see LICENSE file for details.
EOF

# Create startup script
print_status "Creating startup script..."
cat > start.sh << 'EOF'
#!/bin/bash

# AI Registry Startup Script

echo "🧠 Starting AI Model Registry..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the registry
echo "🚀 Starting AI Model Registry on port 3001..."
npm start
EOF

chmod +x start.sh

# Create test script
print_status "Creating test script..."
cat > test-registry.sh << 'EOF'
#!/bin/bash

# Test the AI Registry
echo "🧪 Testing AI Model Registry..."

REGISTRY_URL="http://localhost:3001"

# Test health endpoint
echo "Testing health endpoint..."
curl -s "$REGISTRY_URL/health" | jq '.' || echo "Health check failed"

# Test model registration
echo "Testing model registration..."
curl -s -X POST "$REGISTRY_URL/api/models/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-model",
    "type": "llm",
    "provider": "test",
    "endpoint": "http://localhost:8000",
    "description": "Test model for registry"
  }' | jq '.' || echo "Model registration test failed"

# Test model discovery
echo "Testing model discovery..."
curl -s "$REGISTRY_URL/api/models" | jq '.' || echo "Model discovery test failed"

echo "✅ Tests completed"
EOF

chmod +x test-registry.sh

# Check for Node.js
print_status "Checking prerequisites..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_status "Node.js found: $NODE_VERSION"
else
    print_warning "Node.js not found. Please install Node.js 16+ from https://nodejs.org"
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status "npm found: $NPM_VERSION"
else
    print_warning "npm not found. Please install npm"
fi

if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    print_status "Docker found: $DOCKER_VERSION"
else
    print_warning "Docker not found (optional). Install from https://docker.com"
fi

# Final instructions
echo
echo -e "${GREEN}✅ AI Model Registry setup completed!${NC}"
echo
echo -e "${BLUE}📝 IMPORTANT: Copy the full code from the artifacts:${NC}"
echo "1. Copy the full server code to ai-registry-server.js"
echo "2. Copy the full client code to ai-registry-client.js" 
echo "3. Copy the full dashboard HTML to public/index.html"
echo
echo -e "${BLUE}🚀 To start the registry:${NC}"
echo "   cd $REGISTRY_DIR"
echo "   npm install"
echo "   npm start"
echo
echo -e "${BLUE}🐳 To start with Docker:${NC}"
echo "   cd $REGISTRY_DIR"
echo "   docker-compose up -d"
echo
echo -e "${BLUE}🌐 Access points:${NC}"
echo "   API: http://localhost:$REGISTRY_PORT"
echo "   Dashboard: http://localhost:$REGISTRY_PORT"
echo "   Health: http://localhost:$REGISTRY_PORT/health"
echo
echo -e "${BLUE}🧪 To test:${NC}"
echo "   ./test-registry.sh"
echo
echo -e "${YELLOW}⚠️  Remember to copy the complete code from the artifacts before starting!${NC}"
echo

# Create a simple installer info file
cat > SETUP_COMPLETE.md << EOF
# Setup Complete! 

The AI Model Registry has been set up in the directory: \`$REGISTRY_DIR\`

## Next Steps:

1. **Copy the full code from artifacts:**
   - ai-registry-server.js (full server implementation)
   - ai-registry-client.js (full client library)
   - public/index.html (full dashboard)

2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Start the registry:**
   \`\`\`bash
   npm start
   # or
   ./start.sh
   \`\`\`

4. **Access the dashboard:**
   Open http://localhost:$REGISTRY_PORT in your browser

5. **Test the setup:**
   \`\`\`bash
   ./test-registry.sh
   \`\`\`

## Integration with Ultimate Agent:

Follow the integration guide to connect your Ultimate Agent network to this registry for AI-to-AI communication and model discovery.

The registry will serve as the "DNS for AI" in your network!
EOF

print_status "Setup information saved to SETUP_COMPLETE.md"
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"