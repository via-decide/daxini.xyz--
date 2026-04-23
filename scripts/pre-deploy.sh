#!/bin/bash
# scripts/pre-deploy.sh
# Antigravity Agent: Pre-Deployment Quality Gate

set -e

echo "🔍 [ANTIGRAVITY] Running pre-deployment checks..."

# 1. Code Quality
echo "1️⃣  Linting..."
npm run lint
if [ $? -ne 0 ]; then echo "❌ Linting failed"; exit 1; fi

# 2. Security Scan
echo "2️⃣  Security scanning..."
npm audit --audit-level=moderate
if [ $? -ne 0 ]; then echo "❌ Security vulnerabilities found"; exit 1; fi

# 3. Build Test
echo "3️⃣  Building for production..."
npm run build
if [ $? -ne 0 ]; then echo "❌ Build failed"; exit 1; fi

# 4. Smoke Test
echo "4️⃣  Running smoke tests..."
npm run smoke
if [ $? -ne 0 ]; then echo "❌ Smoke tests failed"; exit 1; fi

echo ""
echo "✅ [ANTIGRAVITY] ALL PRE-DEPLOYMENT CHECKS PASSED"
echo ""
echo "Verdict: SAFE TO DEPLOY 🚀"
