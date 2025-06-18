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
