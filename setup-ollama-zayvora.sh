#!/bin/bash

# ============================================================================
# ZAYVORA ENGINE - OLLAMA INTEGRATION SETUP SCRIPT
# ============================================================================
# This script automates the setup of Zayvora Engine as an Ollama model.
#
# Usage:
#   chmod +x setup-ollama-zayvora.sh
#   ./setup-ollama-zayvora.sh
# ============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ============================================================================
# HEADER
# ============================================================================

echo -e "${BLUE}
╔════════════════════════════════════════════════════════════════╗
║  ZAYVORA ENGINE - OLLAMA INTEGRATION SETUP                     ║
║  India's Sovereign AI Engineering Agent                        ║
╚════════════════════════════════════════════════════════════════╝
${NC}"

# ============================================================================
# STEP 1: CHECK PREREQUISITES
# ============================================================================

echo -e "${BLUE}[1/6] Checking prerequisites...${NC}"

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo -e "${RED}✗ Ollama is not installed${NC}"
    echo "  Install from: https://ollama.ai"
    exit 1
fi
echo -e "${GREEN}✓ Ollama is installed${NC}"

# Check if Ollama service is running
if ! ollama list &> /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Warning: Ollama service may not be running${NC}"
    echo "  Run: ollama serve (in another terminal)"
    echo "  Continuing setup..."
fi

# Check if llama3 is available
if ollama list | grep -q "llama3"; then
    echo -e "${GREEN}✓ Base model (llama3) available${NC}"
else
    echo -e "${YELLOW}⚠ Base model (llama3) not found${NC}"
    echo "  Pulling llama3 (this may take a while)..."
    ollama pull llama3
    echo -e "${GREEN}✓ Base model pulled${NC}"
fi

# ============================================================================
# STEP 2: CREATE MODEL DIRECTORY
# ============================================================================

echo -e "${BLUE}[2/6] Creating Zayvora model directory...${NC}"

OLLAMA_DIR="$HOME/.ollama/models/zayvora"
mkdir -p "$OLLAMA_DIR"
echo -e "${GREEN}✓ Directory created: $OLLAMA_DIR${NC}"

# ============================================================================
# STEP 3: CREATE MODELFILE
# ============================================================================

echo -e "${BLUE}[3/6] Creating Modelfile...${NC}"

cat > "$OLLAMA_DIR/Modelfile" << 'EOF'
# Zayvora Engine - India's Sovereign AI Engineering Agent
# Ollama Model Configuration

FROM llama3

# System prompt defining Zayvora's identity and capabilities
SYSTEM """You are Zayvora Engine, India's Sovereign AI Engineering Agent.

You are an advanced AI system designed to assist with software engineering tasks across the full development lifecycle.

## Core Identity
- Name: Zayvora Engine
- Purpose: Sovereign AI Engineering Agent for India
- Philosophy: Autonomous, secure, privacy-first software development

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
8. Ensure scalability and reliability

## Special Capabilities
- Create complete payment systems with instant verification
- Build sovereign payment infrastructure
- Generate authentication and authorization systems
- Design database schemas with stored procedures
- Implement real-time notification systems
- Create API endpoints with full CRUD operations
- Build responsive frontend interfaces
- Deploy to Vercel and cloud platforms
- Generate comprehensive documentation
- Create pull requests and manage Git workflows

## Communication Style
- Direct and concise
- Code-first approach
- Explain technical decisions
- Provide clear examples
- Document assumptions
- Ask clarifying questions when needed

## India-Specific Context
- Understanding of Indian tech landscape
- Knowledge of RBI regulations and compliance
- Familiarity with UPI and payment systems
- Awareness of data localization requirements
- Support for Indian languages and regional needs"""

# Model parameters for optimal performance
PARAMETER temperature 0.2
PARAMETER top_p 0.95
PARAMETER top_k 40
PARAMETER num_ctx 8192
PARAMETER num_predict 4096

# Optimization parameters
PARAMETER repeat_last_n 64
PARAMETER repeat_penalty 1.1
PARAMETER num_gpu 1

# Metadata
METADATA author "Zayvora / via-decide"
METADATA license "Apache-2.0"
METADATA description "India's Sovereign AI Engineering Agent"
EOF

echo -e "${GREEN}✓ Modelfile created${NC}"
echo "  Location: $OLLAMA_DIR/Modelfile"

# ============================================================================
# STEP 4: BUILD MODEL
# ============================================================================

echo -e "${BLUE}[4/6] Building Zayvora model...${NC}"
echo "  This may take a minute..."

if ollama create zayvora -f "$OLLAMA_DIR/Modelfile"; then
    echo -e "${GREEN}✓ Model built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build model${NC}"
    echo "  Try running: ollama serve (in another terminal)"
    exit 1
fi

# ============================================================================
# STEP 5: VERIFY INSTALLATION
# ============================================================================

echo -e "${BLUE}[5/6] Verifying installation...${NC}"

if ollama list | grep -q "zayvora"; then
    echo -e "${GREEN}✓ Zayvora model verified in ollama list${NC}"
else
    echo -e "${RED}✗ Zayvora model not found${NC}"
    echo "  Try running: ollama list"
    exit 1
fi

# ============================================================================
# STEP 6: TEST MODEL
# ============================================================================

echo -e "${BLUE}[6/6] Testing Zayvora model...${NC}"
echo "  Running: ollama run zayvora 'who are you'"
echo ""

# Run a quick test
RESPONSE=$(ollama run zayvora "who are you" 2>/dev/null)

if [[ $RESPONSE == *"Zayvora"* ]] || [[ $RESPONSE == *"Engineering"* ]]; then
    echo -e "${GREEN}✓ Model test successful${NC}"
    echo ""
    echo "Response preview:"
    echo "$RESPONSE" | head -3
else
    echo -e "${YELLOW}⚠ Model responded but may need more context${NC}"
fi

# ============================================================================
# SUCCESS
# ============================================================================

echo ""
echo -e "${GREEN}
╔════════════════════════════════════════════════════════════════╗
║  ✓ ZAYVORA ENGINE SUCCESSFULLY INTEGRATED WITH OLLAMA          ║
╚════════════════════════════════════════════════════════════════╝
${NC}"

echo -e "${BLUE}NEXT STEPS:${NC}"
echo ""
echo "1. Start using Zayvora:"
echo -e "   ${GREEN}ollama run zayvora${NC}"
echo ""
echo "2. Example usage:"
echo -e "   ${GREEN}ollama run zayvora \"Design a payment system API\"${NC}"
echo ""
echo "3. Access Ollama Web UI (if installed):"
echo -e "   ${GREEN}http://localhost:7860${NC}"
echo ""
echo "4. View detailed documentation:"
echo -e "   ${GREEN}cat OLLAMA_INTEGRATION.md${NC}"
echo ""
echo -e "${BLUE}COMMANDS:${NC}"
echo -e "  ${GREEN}ollama run zayvora${NC}              Start interactive mode"
echo -e "  ${GREEN}ollama list${NC}                     Show all models"
echo -e "  ${GREEN}ollama rm zayvora${NC}               Remove the model"
echo -e "  ${GREEN}ollama run zayvora \"prompt\"${NC}    Run with specific prompt"
echo ""
echo -e "${YELLOW}Happy engineering with Zayvora!${NC}"
echo ""
