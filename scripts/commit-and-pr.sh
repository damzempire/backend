#!/bin/bash

BRANCH_NAME="feat/portfolio-aggregation-16"

echo "🚀 Setting up branch and committing Issue #16"

# Create and switch to the new branch
git checkout -b $BRANCH_NAME

# Add all changes
git add .

# Commit changes
git commit -m "feat: Implement portfolio aggregation endpoint

- Add GET /api/user/:address/portfolio endpoint
- Aggregate multiple vaults (advisor + investor)
- Return { total_locked: 100, total_claimable: 20 }
- Add CORS and JSON middleware
- Include test suite and deployment scripts

Fixes #16"

echo " Pushing to origin..."
git push origin $BRANCH_NAME

echo "✅ Changes committed and pushed successfully!"
echo "📋 You can now create the Pull Request on GitHub."
echo ""
echo "🔗 Link: https://github.com/Vesting-Vault/backend/compare/main...$BRANCH_NAME"
echo ""
echo "🎊 Issue #16 Implementation Complete!"
