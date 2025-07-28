#!/bin/bash

# Build the Docker image
echo "Building Docker image..."
docker build -t gchat-bot .

# Run the container with proper signal handling
echo "Starting container..."
docker run --rm -p 8080:8080 --name gchat-bot-container gchat-bot 