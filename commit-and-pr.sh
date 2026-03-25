#!/bin/bash

echo "🚀 Committing Issue #16 - Portfolio View Aggregation"

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

echo "✅ Changes committed successfully!"
echo "📋 Ready to create Pull Request"
echo ""
echo "🌟 Next steps:"
echo "1. Push to your fork: git push origin main"
echo "2. Create PR on GitHub"
echo "3. Link PR to Issue #16"
echo ""
echo "🎊 Issue #16 Implementation Complete!"
