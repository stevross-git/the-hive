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
