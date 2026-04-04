# Zayvora Engine — Ollama Integration Guide

## Overview

This guide integrates Zayvora Engine as a native Ollama model, making it available as:

```bash
ollama run zayvora
```

Zayvora will appear in the Ollama UI model selector and be runnable locally with its complete engineering capabilities.

---

## Prerequisites

1. **Ollama installed** — Download from https://ollama.ai
2. **Base model available** — `ollama pull llama3` (or your preferred base model)
3. **4GB+ VRAM** — Minimum for smooth operation
4. **8GB+ RAM** — Recommended for better performance

### Check Prerequisites

```bash
# Verify Ollama is installed
ollama --version

# List available models
ollama list

# If llama3 not present, pull it
ollama pull llama3
```

---

## Setup Instructions

### Step 1: Create Zayvora Directory

```bash
# Create the model directory
mkdir -p ~/.ollama/models/zayvora

# Or, if you prefer a custom location:
mkdir -p /opt/ollama/zayvora
```

### Step 2: Download or Create Modelfile

#### Option A: Download from Repository

```bash
cd ~/.ollama/models/zayvora

# Copy the Modelfile from daxini.xyz repository
curl -o Modelfile https://raw.githubusercontent.com/via-decide/daxini.xyz/main/Modelfile
```

#### Option B: Create Locally

```bash
# Create the Modelfile with Zayvora configuration
cat > ~/.ollama/models/zayvora/Modelfile << 'EOF'
FROM llama3

SYSTEM """You are Zayvora Engine, India's Sovereign AI Engineering Agent.

## Core Identity
- Name: Zayvora Engine
- Purpose: Autonomous software engineering agent
- Philosophy: Secure, sovereign, privacy-first development

## Primary Capabilities
- Repository analysis and code comprehension
- Software architecture design and planning
- Autonomous code generation and refactoring
- Infrastructure orchestration and deployment
- GitHub automation and PR workflows
- Payment system integration
- Security analysis and hardening
- Database schema design
- API endpoint development
- Frontend-backend integration

## Technical Expertise
- Languages: Python, JavaScript/TypeScript, Go, Rust, SQL
- Frameworks: React, Next.js, Express, FastAPI, Django
- Cloud: Vercel, AWS, GCP, Docker, Kubernetes
- Databases: PostgreSQL, MySQL, MongoDB, Redis
- DevOps: CI/CD, Terraform, GitHub Actions, Vercel
- AI/ML: LLM integration, embedding systems, RAG

## Work Approach
1. Understand the problem thoroughly before acting
2. Plan architecture before implementation
3. Write secure, production-ready code
4. Test comprehensively before deployment
5. Document clearly for maintenance
6. Consider security implications
7. Optimize for performance
8. Ensure scalability and reliability"""

PARAMETER temperature 0.2
PARAMETER top_p 0.95
PARAMETER top_k 40
PARAMETER num_ctx 8192
PARAMETER num_predict 4096
PARAMETER repeat_last_n 64
PARAMETER repeat_penalty 1.1
EOF
```

### Step 3: Build the Zayvora Model

```bash
# Build the model from Modelfile
ollama create zayvora -f ~/.ollama/models/zayvora/Modelfile

# Alternative (from custom location):
ollama create zayvora -f /opt/ollama/zayvora/Modelfile
```

**Expected Output:**
```
creating model metadata
creating model layer
creating config layer
using already created layer sha256:...
writing manifest
success
```

### Step 4: Verify Installation

```bash
# List all models
ollama list

# Expected output includes:
# zayvora          latest    <hash>    <size>    <date>
```

### Step 5: Test the Model

#### Quick Test

```bash
# Run Zayvora and ask who it is
ollama run zayvora "Who are you?"

# Expected response:
# I am Zayvora Engine, India's Sovereign AI Engineering Agent.
# I specialize in autonomous software engineering, code generation, 
# infrastructure orchestration, and GitHub automation...
```

#### Interactive Mode

```bash
# Start Zayvora in interactive mode
ollama run zayvora

# Prompt examples:
# > who are you
# > design a payment API for processing UPI transactions
# > analyze this repository structure
# > create a database schema for a credit store
# > write a GitHub Actions workflow for CI/CD
```

---

## Integration with Ollama Web UI

### If Using Ollama Web UI

The model will automatically appear in the model selector dropdown once it's created.

**Steps:**

1. **Access Ollama Web UI:**
   ```
   http://localhost:7860
   ```

2. **Select Model:**
   - Click the model selector dropdown
   - Search for "zayvora"
   - Select "zayvora" from the list

3. **Start Chatting:**
   - Type your engineering question
   - Get autonomous responses from Zayvora

### If Using Third-Party UIs

The model works with any Ollama-compatible interface:

- **Open WebUI** — https://github.com/open-webui/open-webui
- **Ollama Web UI** — Built-in interface
- **Continued** — VS Code extension
- **LLaMA CLI** — Command line interface

All will automatically discover the `zayvora` model.

---

## Configuration Options

### Adjust Temperature (Creativity vs Determinism)

Higher temperature = more creative responses
Lower temperature = more deterministic, focused responses

```bash
# For code generation (low temperature):
ollama run zayvora --temperature 0.1

# For brainstorming (higher temperature):
ollama run zayvora --temperature 0.8
```

### Increase Context Window

For analyzing large codebases:

```bash
# Increase context to 16k tokens
ollama run zayvora --num_ctx 16384
```

### Enable GPU Acceleration

For faster inference:

```bash
# Force GPU usage
ollama run zayvora --num_gpu 1

# Disable GPU (CPU only)
ollama run zayvora --num_gpu 0
```

---

## Example Use Cases

### 1. Repository Analysis

```
User: Analyze the architecture of my Next.js project in /path/to/project

Zayvora: [Provides comprehensive architecture analysis, identifies patterns, 
suggests improvements]
```

### 2. Code Generation

```
User: Generate a TypeScript function to validate UPI transaction amounts

Zayvora: [Generates production-ready function with error handling, types, tests]
```

### 3. Database Design

```
User: Design a database schema for a payment processing system

Zayvora: [Creates complete schema with tables, indexes, foreign keys, 
stored procedures]
```

### 4. API Endpoint Development

```
User: Create a REST API endpoint for processing credit purchases

Zayvora: [Generates complete endpoint with validation, error handling, 
response formatting]
```

### 5. Infrastructure Planning

```
User: Design a deployment architecture for a React + Node.js application

Zayvora: [Provides deployment plan, Docker configs, CI/CD workflows, 
monitoring setup]
```

---

## Troubleshooting

### Model Not Appearing in Ollama List

```bash
# Check Ollama service is running
ollama serve

# In another terminal, check models
ollama list

# If still not showing, rebuild
ollama rm zayvora
ollama create zayvora -f ~/.ollama/models/zayvora/Modelfile
```

### Out of Memory Error

```bash
# Reduce context window
ollama run zayvora --num_ctx 4096

# Disable GPU if using
ollama run zayvora --num_gpu 0

# Use a smaller base model
# Edit Modelfile: FROM mistral (instead of FROM llama3)
```

### Model Running Slow

```bash
# Enable GPU
ollama run zayvora --num_gpu 1

# Increase allocated resources
# Restart Ollama with more memory: export OLLAMA_NUM_GPU=1

# Reduce num_predict tokens
ollama run zayvora --num_predict 1024
```

### Modelfile Syntax Errors

```bash
# Validate Modelfile syntax
ollama show zayvora

# If error, check Modelfile format:
# - No tabs (use spaces)
# - Proper line breaks
# - Quoted strings for multi-line content
```

---

## Customization

### Modify System Prompt

Edit `~/.ollama/models/zayvora/Modelfile`:

```dockerfile
FROM llama3

SYSTEM """Your custom system prompt here"""

PARAMETER temperature 0.2
```

Then rebuild:
```bash
ollama create zayvora -f ~/.ollama/models/zayvora/Modelfile
```

### Use Different Base Model

```dockerfile
# Instead of llama3, use:
FROM mistral         # Faster, smaller
FROM neural-chat     # Optimized for chat
FROM dolphin         # Better reasoning
FROM orca-mini       # Even smaller
```

### Add Custom Parameters

```dockerfile
PARAMETER temperature 0.1
PARAMETER top_p 0.9
PARAMETER top_k 30
PARAMETER num_ctx 8192
PARAMETER num_predict 4096
PARAMETER repeat_penalty 1.05
```

---

## Advanced: Multi-Model Setup

### Create Variants

```bash
# Create engineering-focused variant
ollama create zayvora-code -f ~/.ollama/models/zayvora/Modelfile.code

# Create analysis-focused variant
ollama create zayvora-analysis -f ~/.ollama/models/zayvora/Modelfile.analysis

# Create chat-focused variant
ollama create zayvora-chat -f ~/.ollama/models/zayvora/Modelfile.chat
```

### Switch Between Variants

```bash
# Code generation
ollama run zayvora-code "Write a payment processor"

# Analysis
ollama run zayvora-analysis "Analyze this architecture"

# Chat
ollama run zayvora-chat "How do I deploy to Vercel?"
```

---

## API Integration

### Use Zayvora with Ollama API

```python
import requests
import json

# Ollama API endpoint
url = "http://localhost:11434/api/generate"

# Request
payload = {
    "model": "zayvora",
    "prompt": "Design a database schema for a credit system",
    "stream": False,
    "temperature": 0.2
}

response = requests.post(url, json=payload)
result = response.json()

print(result["response"])
```

### Use in Node.js

```javascript
const fetch = require('node-fetch');

const generateWithZayvora = async (prompt) => {
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'zayvora',
      prompt: prompt,
      stream: false,
      temperature: 0.2
    })
  });

  const data = await response.json();
  return data.response;
};

// Usage
generateWithZayvora("Create a REST API endpoint").then(console.log);
```

---

## Performance Tuning

### Optimal Settings by Hardware

#### Minimum (4GB GPU)
```
num_ctx: 4096
num_predict: 2048
num_gpu: 1
temperature: 0.2
```

#### Standard (8GB GPU)
```
num_ctx: 8192
num_predict: 4096
num_gpu: 1
temperature: 0.2
```

#### High-Performance (16GB+ GPU)
```
num_ctx: 16384
num_predict: 8192
num_gpu: 1
temperature: 0.2
repeat_penalty: 1.05
```

---

## Monitoring

### Check Zayvora Status

```bash
# See running processes
ollama ps

# Expected output:
# NAME      ID                  SIZE    DIGEST
# zayvora   <hash>              4.7GB   <hash>
```

### Monitor Resource Usage

```bash
# macOS
top

# Linux
htop

# Windows (PowerShell)
Get-Process ollama | select CPU, WorkingSet
```

---

## Uninstallation

### Remove Zayvora Model

```bash
# Delete the model
ollama rm zayvora

# Clean up model files
rm -rf ~/.ollama/models/zayvora
```

---

## Summary

| Step | Command | Status |
|------|---------|--------|
| 1. Create Directory | `mkdir ~/.ollama/models/zayvora` | ✅ |
| 2. Create Modelfile | `cat > Modelfile << EOF...EOF` | ✅ |
| 3. Build Model | `ollama create zayvora -f Modelfile` | ✅ |
| 4. Verify | `ollama list \| grep zayvora` | ✅ |
| 5. Test | `ollama run zayvora "who are you"` | ✅ |
| 6. Use | `ollama run zayvora` | ✅ Ready |

---

## Support & Documentation

- **Ollama Docs:** https://github.com/jmorganca/ollama
- **Model API:** https://github.com/jmorganca/ollama/blob/main/docs/api.md
- **Zayvora Repo:** https://github.com/via-decide/daxini.xyz
- **Issue Tracker:** https://github.com/via-decide/daxini.xyz/issues

---

**Zayvora Engine is now integrated with Ollama and ready to use!**

```bash
ollama run zayvora

# Start asking engineering questions...
```
