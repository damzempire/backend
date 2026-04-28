# Web3 Cap Table API Documentation

## Overview

The Web3 Cap Table API provides real-time ownership tracking and analytics for tokenized equity. It groups all individual vesting schedules by user/entity and calculates their total fully-diluted ownership percentage of the token supply, effectively generating a real-time Web3 Cap Table.

## Features

- **Real-time Cap Table Generation**: Generate comprehensive cap tables for any token
- **Ownership Calculations**: Calculate both current vested ownership and fully-diluted ownership
- **Organization-level Views**: Get cap table breakdowns by organization
- **Individual Beneficiary Tracking**: Track individual positions across all vaults
- **Concentration Analytics**: Analyze ownership concentration with Gini coefficient and HHI
- **Historical Analytics**: Track cap table changes over time
- **Search and Filtering**: Search beneficiaries and filter by various criteria
- **Export Capabilities**: Export cap tables to CSV/Excel formats

## GraphQL Endpoints

### Main Cap Table Queries

#### `web3CapTable`
Generate a comprehensive cap table for a specific token.

```graphql
query GetWeb3CapTable($tokenAddress: String!, $options: CapTableOptions) {
  web3CapTable(tokenAddress: $tokenAddress, options: $options) {
    tokenAddress
    tokenInfo {
      address
      symbol
      name
      decimals
    }
    asOfDate
    totalSupply
    totalAllocated
    totalUnallocated
    totalBeneficiaries
    totalVaults
    beneficiaryHoldings {
      beneficiaryAddress
      email
      holdings {
        vaultAddress
        vaultName
        tokenAddress
        tokenSymbol
        organization
        totalAllocated
        vestedAmount
        totalWithdrawn
        withdrawableAmount
        vestingProgress
        isFullyVested
      }
      organizations
      totalAllocated
      totalVested
      totalWithdrawn
      totalWithdrawable
      ownershipPercentage
      fullyDilutedOwnership
    }
    organizationBreakdown {
      organizationName
      beneficiaries {
        beneficiaryAddress
        totalAllocated
        totalVested
        totalWithdrawn
      }
      totalAllocated
      totalVested
      totalWithdrawn
      beneficiaryCount
    }
    summary {
      totalAllocated
      totalVested
      totalWithdrawn
      totalUnallocated
      vestingProgress
      averageHoldingPerBeneficiary
      topHolderPercentage
      top10Percentage
      activeVaults
      totalVaults
    }
    generatedAt
  }
}
```

**Variables:**
```json
{
  "tokenAddress": "0x1234567890123456789012345678901234567890",
  "options": {
    "includeInactive": false,
    "organizationId": "org-123",
    "asOfDate": "2024-01-15T00:00:00Z"
  }
}
```

#### `organizationCapTable`
Get cap table data for a specific organization (can span multiple tokens).

```graphql
query GetOrganizationCapTable($organizationId: String!, $options: OrganizationCapTableOptions) {
  organizationCapTable(organizationId: $organizationId, options: $options) {
    organizationId
    organization {
      id
      name
      admin_address
    }
    tokens {
      tokenAddress
      tokenInfo {
        address
        symbol
        name
        decimals
      }
      totalSupply
      beneficiaryHoldings {
        beneficiaryAddress
        totalAllocated
        totalVested
        fullyDilutedOwnership
      }
      summary {
        totalAllocated
        totalVested
        topHolderPercentage
      }
    }
    generatedAt
  }
}
```

#### `beneficiaryCapPosition`
Get an individual beneficiary's complete position across all their holdings.

```graphql
query GetBeneficiaryPosition($beneficiaryAddress: String!, $tokenAddress: String) {
  beneficiaryCapPosition(beneficiaryAddress: $beneficiaryAddress, tokenAddress: $tokenAddress) {
    beneficiaryAddress
    holdings {
      vaultAddress
      vaultName
      tokenAddress
      tokenSymbol
      organization
      totalAllocated
      vestedAmount
      totalWithdrawn
      withdrawableAmount
      vestingProgress
      isFullyVested
    }
    totalAllocated
    totalVested
    totalWithdrawn
    totalWithdrawable
    generatedAt
  }
}
```

### Analytics and Search Queries

#### `capTableAnalytics`
Get historical analytics for a token's cap table.

```graphql
query GetCapTableAnalytics($tokenAddress: String!, $period: String!) {
  capTableAnalytics(tokenAddress: $tokenAddress, period: $period) {
    tokenAddress
    period
    startDate
    endDate
    newBeneficiaries
    totalNewAllocations
    vestingProgressChange
    concentrationChange
    topHolderChange
    totalClaims
    totalClaimedAmount
    averageClaimAmount
    dailyData {
      date
      totalBeneficiaries
      totalAllocated
      totalVested
      newAllocations
      claimsCount
      claimedAmount
    }
  }
}
```

#### `vestingConcentration`
Get detailed concentration metrics for ownership analysis.

```graphql
query GetVestingConcentration($tokenAddress: String!, $organizationId: String) {
  vestingConcentration(tokenAddress: $tokenAddress, organizationId: $organizationId) {
    tokenAddress
    totalBeneficiaries
    top1Percentage
    top5Percentage
    top10Percentage
    top20Percentage
    giniCoefficient
    hhi
    decileBreakdown {
      decile
      beneficiaryCount
      totalOwnership
      averageHolding
    }
    calculatedAt
  }
}
```

#### `searchCapTableBeneficiaries`
Search beneficiaries in the cap table.

```graphql
query SearchBeneficiaries($tokenAddress: String!, $query: String!, $first: Int) {
  searchCapTableBeneficiaries(tokenAddress: $tokenAddress, query: $query, first: $first) {
    beneficiaryAddress
    email
    organizations
    totalAllocated
    totalVested
    fullyDilutedOwnership
  }
}
```

#### `topTokenHolders`
Get top token holders by vested amount.

```graphql
query GetTopHolders($tokenAddress: String!, $limit: Int) {
  topTokenHolders(tokenAddress: $tokenAddress, limit: $limit) {
    beneficiaryAddress
    totalAllocated
    totalVested
    ownershipPercentage
    fullyDilutedOwnership
  }
}
```

### Mutations

#### `refreshCapTable`
Refresh cap table calculations (recalculate vested amounts).

```graphql
mutation RefreshCapTable($tokenAddress: String!) {
  refreshCapTable(tokenAddress: $tokenAddress)
}
```

#### `exportCapTable`
Export cap table to CSV or Excel format.

```graphql
mutation ExportCapTable($tokenAddress: String!, $format: String!) {
  exportCapTable(tokenAddress: $tokenAddress, format: $format)
}
```

#### `generateCapTableReport`
Generate a PDF report of the cap table.

```graphql
mutation GenerateReport($tokenAddress: String!, $reportType: String!) {
  generateCapTableReport(tokenAddress: $tokenAddress, reportType: $reportType)
}
```

## Data Models

### Web3CapTable
The main cap table response containing complete ownership information.

### BeneficiaryPosition
Individual beneficiary's position with all their holdings and ownership percentages.

### VaultHolding
Specific vault-level holding details for a beneficiary.

### ConcentrationMetrics
Advanced concentration analysis including Gini coefficient and HHI.

### CapTableAnalytics
Historical analytics and trends for cap table changes.

## Key Concepts

### Fully-Diluted Ownership
Represents the maximum potential ownership percentage assuming all vesting schedules complete.

### Vested Ownership
Current ownership percentage based on tokens that have already vested.

### Concentration Metrics
- **Gini Coefficient**: Measures inequality (0 = perfect equality, 1 = perfect inequality)
- **HHI (Herfindahl-Hirschman Index)**: Market concentration measure
- **Top Holder Percentages**: Ownership concentration by top N holders

### Vesting Progress
Percentage of total allocated tokens that have already vested.

## Use Cases

### 1. Investor Relations
- Provide real-time cap table views to investors
- Generate ownership reports for board meetings
- Track dilution over time

### 2. Compliance & Reporting
- Export cap tables for regulatory filings
- Monitor ownership concentration for compliance
- Generate audit trails

### 3. Portfolio Management
- Track individual portfolio positions
- Analyze ownership concentration risks
- Monitor vesting schedules

### 4. Token Analytics
- Understand token distribution
- Track holder concentration
- Analyze vesting progress

## Performance Considerations

- Cap table generation is computationally intensive for large token ecosystems
- Consider caching results for frequently accessed tokens
- Use pagination for large beneficiary lists
- Filter by organization when possible to reduce query scope

## Rate Limits

Cap table queries have higher rate limits due to their computational complexity:
- `web3CapTable`: 10 requests/minute
- `organizationCapTable`: 15 requests/minute
- `beneficiaryCapPosition`: 30 requests/minute
- Analytics queries: 20 requests/minute

## Error Handling

Common error scenarios:
- **Token not found**: Returns empty cap table structure
- **Invalid address**: Returns validation error
- **Insufficient permissions**: Returns authorization error
- **Rate limit exceeded**: Returns rate limit error with retry-after header

## Examples

### Basic Cap Table Query
```graphql
query {
  web3CapTable(tokenAddress: "0x1234567890123456789012345678901234567890") {
    tokenInfo {
      symbol
      name
    }
    totalBeneficiaries
    summary {
      topHolderPercentage
      vestingProgress
    }
  }
}
```

### Concentration Analysis
```graphql
query {
  vestingConcentration(tokenAddress: "0x1234567890123456789012345678901234567890") {
    giniCoefficient
    hhi
    top1Percentage
    top10Percentage
  }
}
```

### Search Beneficiaries
```graphql
query {
  searchCapTableBeneficiaries(
    tokenAddress: "0x1234567890123456789012345678901234567890"
    query: "0xabc"
    first: 10
  ) {
    beneficiaryAddress
    fullyDilutedOwnership
    organizations
  }
}
```
