#!/bin/bash
echo "Setting up Chronicle with Ollama..."

# Pull required models
ollama pull llama3
ollama pull nomic-embed-text

# Start ChromaDB

mkdir -p ../chronicle_data
chroma run --host localhost --port 8000 --path ../chronicle_data


