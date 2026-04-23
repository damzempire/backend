const { gql } = require('apollo-server-express');

// GraphQL schema extensions for Web3 Cap Table functionality
const capTableTypeDefs = gql`
  scalar BigDecimal

  # Token information
  type TokenInfo {
    address: String!
    symbol: String!
    name: String!
    decimals: Int!
  }

  # Individual vault holding for a beneficiary
  type VaultHolding {
    vaultAddress: String!
    vaultName: String
    tokenAddress: String!
    tokenSymbol: String
    organization: String
    organizationId: String
    totalAllocated: BigDecimal!
    vestedAmount: BigDecimal!
    totalWithdrawn: BigDecimal!
    withdrawableAmount: BigDecimal!
    vestingProgress: Float!
    isFullyVested: Boolean!
    scheduleCount: Int!
    activeSchedules: Int!
  }

  # Beneficiary's complete position across all vaults
  type BeneficiaryPosition {
    beneficiaryAddress: String!
    email: String
    holdings: [VaultHolding!]!
    organizations: [String!]!
    totalAllocated: BigDecimal!
    totalVested: BigDecimal!
    totalWithdrawn: BigDecimal!
    totalWithdrawable: BigDecimal!
    ownershipPercentage: Float!
    fullyDilutedOwnership: Float!
  }

  # Organization-level breakdown
  type OrganizationBreakdown {
    organizationName: String!
    beneficiaries: [OrganizationBeneficiary!]!
    totalAllocated: BigDecimal!
    totalVested: BigDecimal!
    totalWithdrawn: BigDecimal!
    beneficiaryCount: Int!
  }

  # Simplified beneficiary info for organization breakdown
  type OrganizationBeneficiary {
    beneficiaryAddress: String!
    totalAllocated: BigDecimal!
    totalVested: BigDecimal!
    totalWithdrawn: BigDecimal!
  }

  # Cap table summary statistics
  type CapTableSummary {
    totalAllocated: BigDecimal!
    totalVested: BigDecimal!
    totalWithdrawn: BigDecimal!
    totalUnallocated: BigDecimal!
    vestingProgress: Float!
    averageHoldingPerBeneficiary: BigDecimal!
    topHolderPercentage: Float!
    top10Percentage: Float!
    activeVaults: Int!
    totalVaults: Int!
  }

  # Main Web3 Cap Table response
  type Web3CapTable {
    tokenAddress: String!
    tokenInfo: TokenInfo!
    asOfDate: Date!
    totalSupply: BigDecimal!
    totalAllocated: BigDecimal!
    totalUnallocated: BigDecimal!
    totalBeneficiaries: Int!
    totalVaults: Int!
    beneficiaryHoldings: [BeneficiaryPosition!]!
    organizationBreakdown: [OrganizationBreakdown!]!
    summary: CapTableSummary!
    generatedAt: Date!
  }

  # Organization cap table (can span multiple tokens)
  type OrganizationCapTable {
    organizationId: String!
    organization: Organization
    tokens: [TokenCapTable!]!
    generatedAt: Date!
  }

  # Token-specific cap table within an organization
  type TokenCapTable {
    tokenAddress: String!
    tokenInfo: TokenInfo!
    totalSupply: BigDecimal!
    beneficiaryHoldings: [BeneficiaryPosition!]!
    summary: CapTableSummary!
  }

  # Individual beneficiary position across all their holdings
  type BeneficiaryCapPosition {
    beneficiaryAddress: String!
    holdings: [VaultHolding!]!
    totalAllocated: BigDecimal!
    totalVested: BigDecimal!
    totalWithdrawn: BigDecimal!
    totalWithdrawable: BigDecimal!
    generatedAt: Date!
  }

  # Input types for cap table queries
  input CapTableOptions {
    includeInactive: Boolean = false
    organizationId: String
    asOfDate: Date
  }

  input OrganizationCapTableOptions {
    tokenAddress: String
    asOfDate: Date
  }

  # Cap table analytics
  type CapTableAnalytics {
    tokenAddress: String!
    period: String!
    startDate: Date!
    endDate: Date!
    
    # Vesting analytics
    newBeneficiaries: Int!
    totalNewAllocations: BigDecimal!
    vestingProgressChange: Float!
    
    # Concentration analytics
    concentrationChange: Float!
    topHolderChange: Float!
    
    # Activity metrics
    totalClaims: Int!
    totalClaimedAmount: BigDecimal!
    averageClaimAmount: BigDecimal!
    
    # Daily breakdown
    dailyData: [DailyCapTableData!]!
  }

  type DailyCapTableData {
    date: Date!
    totalBeneficiaries: Int!
    totalAllocated: BigDecimal!
    totalVested: BigDecimal!
    newAllocations: BigDecimal!
    claimsCount: Int!
    claimedAmount: BigDecimal!
  }

  # Extend the main Query type
  extend type Query {
    # Get comprehensive Web3 Cap Table for a token
    web3CapTable(
      tokenAddress: String!
      options: CapTableOptions
    ): Web3CapTable!

    # Get organization-level cap table
    organizationCapTable(
      organizationId: String!
      options: OrganizationCapTableOptions
    ): OrganizationCapTable!

    # Get individual beneficiary's position
    beneficiaryCapPosition(
      beneficiaryAddress: String!
      tokenAddress: String
    ): BeneficiaryCapPosition!

    # Get cap table analytics
    capTableAnalytics(
      tokenAddress: String!
      period: String = "30d" # 7d, 30d, 90d, 1y
      organizationId: String
    ): CapTableAnalytics!

    # Search beneficiaries in cap table
    searchCapTableBeneficiaries(
      tokenAddress: String!
      query: String!
      first: Int = 50
      after: String
    ): [BeneficiaryPosition!]!

    # Get top token holders
    topTokenHolders(
      tokenAddress: String!
      limit: Int = 10
      organizationId: String
    ): [BeneficiaryPosition!]!

    # Get vesting concentration metrics
    vestingConcentration(
      tokenAddress: String!
      organizationId: String
    ): ConcentrationMetrics!
  }

  # Concentration metrics for cap table analysis
  type ConcentrationMetrics {
    tokenAddress: String!
    totalBeneficiaries: Int!
    
    # Ownership concentration
    top1Percentage: Float!
    top5Percentage: Float!
    top10Percentage: Float!
    top20Percentage: Float!
    
    # Gini coefficient for inequality measurement
    giniCoefficient: Float!
    
    # HHI (Herfindahl-Hirschman Index)
    hhi: Float!
    
    # Decile breakdown
    decileBreakdown: [DecileData!]!
    
    calculatedAt: Date!
  }

  type DecileData {
    decile: Int!
    beneficiaryCount: Int!
    totalOwnership: Float!
    averageHolding: BigDecimal!
  }

  # Extend the main Mutation type for cap table operations
  extend type Mutation {
    # Refresh cap table calculations (recalculate vested amounts)
    refreshCapTable(tokenAddress: String!): Boolean!

    # Export cap table to CSV
    exportCapTable(
      tokenAddress: String!
      options: CapTableOptions
      format: String = "csv" # csv, xlsx
    ): String! # Returns download URL

    # Generate cap table report
    generateCapTableReport(
      tokenAddress: String!
      reportType: String! # summary, detailed, concentration
      options: CapTableOptions
    ): String! # Returns report URL
  }
`;

module.exports = capTableTypeDefs;
