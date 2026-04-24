const { gql } = require('apollo-server-express');

// Extended GraphQL schema for optimized vesting history queries
const vestingTypeDefs = gql`
  scalar Date
  scalar BigDecimal

  # Vesting Schedule with complete information
  type VestingSchedule {
    id: ID!
    vaultId: ID!
    vaultAddress: String!
    vaultName: String
    tokenAddress: String!
    ownerAddress: String!
    beneficiaryAddress: String!
    organizationId: String
    organizationName: String
    
    # Vesting details
    totalAllocated: BigDecimal!
    totalWithdrawn: BigDecimal!
    remainingAmount: BigDecimal!
    
    # Schedule details
    topUpAmount: BigDecimal!
    cliffDuration: Int!
    cliffDate: Date
    vestingStartDate: Date!
    vestingDuration: Int!
    startTimestamp: Date!
    endTimestamp: Date!
    
    # Status information
    isActive: Boolean!
    isFullyVested: Boolean!
    isCliffPassed: Boolean!
    vestingProgress: Float! # 0.0 to 1.0
    
    # Timestamps
    createdAt: Date!
    updatedAt: Date!
    blockNumber: Int
    transactionHash: String!
    
    # Calculated fields
    vestedAmount: BigDecimal!
    withdrawableAmount: BigDecimal!
    nextVestTime: Date
    
    # Associated data
    claims: [ClaimHistory]
    milestones: [VestingMilestone]
  }

  # Claim history with enhanced information
  type ClaimHistory {
    id: ID!
    userAddress: String!
    tokenAddress: String!
    vaultId: ID!
    vaultAddress: String!
    amountClaimed: BigDecimal!
    claimTimestamp: Date!
    transactionHash: String!
    blockNumber: Int!
    priceAtClaimUsd: BigDecimal
    conversionEventId: String
    
    # Calculated fields
    usdValue: BigDecimal
    gasUsed: BigDecimal
    gasFeeUsd: BigDecimal
  }

  # Vesting milestone for tracking progress
  type VestingMilestone {
    id: ID!
    vaultId: ID!
    milestoneType: String!
    description: String!
    targetDate: Date!
    targetAmount: BigDecimal!
    isCompleted: Boolean!
    completedAt: Date
    createdAt: Date!
  }

  # Vesting summary for a user
  type VestingSummary {
    userAddress: String!
    totalVaults: Int!
    activeVaults: Int!
    completedVaults: Int!
    
    # Financial summary
    totalAllocated: BigDecimal!
    totalWithdrawn: BigDecimal!
    totalRemaining: BigDecimal!
    totalValueUsd: BigDecimal!
    
    # Performance metrics
    averageVestingProgress: Float!
    nextClaimAmount: BigDecimal!
    nextClaimTime: Date
    
    # Recent activity
    recentClaims: [ClaimHistory]
    upcomingMilestones: [VestingMilestone]
  }

  # Aggregated vesting statistics
  type VestingStatistics {
    totalVaults: Int!
    activeVaults: Int!
    completedVaults: Int!
    
    # Financial metrics
    totalAllocated: BigDecimal!
    totalWithdrawn: BigDecimal!
    totalRemaining: BigDecimal!
    
    # Time-based metrics
    claimsLast24h: Int!
    claimsLast7d: Int!
    claimsLast30d: Int!
    
    # Performance metrics
    averageVestingDuration: Int!
    averageCliffDuration: Int!
  }

  # Input types for filtering and pagination
  input VestingScheduleFilter {
    userAddress: String
    vaultAddress: String
    tokenAddress: String
    organizationId: String
    isActive: Boolean
    isFullyVested: Boolean
    dateRange: DateRange
  }

  input DateRange {
    startDate: Date
    endDate: Date
  }

  input PaginationInput {
    first: Int = 50
    after: String
    last: Int
    before: String
  }

  input SortInput {
    field: String!
    direction: SortDirection = ASC
  }

  enum SortDirection {
    ASC
    DESC
  }

  # Connection types for pagination
  type VestingScheduleConnection {
    edges: [VestingScheduleEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type VestingScheduleEdge {
    node: VestingSchedule!
    cursor: String!
  }

  type ClaimHistoryConnection {
    edges: [ClaimHistoryEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type ClaimHistoryEdge {
    node: ClaimHistory!
    cursor: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }

  # Query extensions
  extend type Query {
    # Get user's complete vesting history
    vestingHistory(
      userAddress: String!
      filter: VestingScheduleFilter
      pagination: PaginationInput
      sort: SortInput
    ): VestingScheduleConnection!

    # Get vesting summary for a user
    vestingSummary(userAddress: String!): VestingSummary!

    # Get specific vesting schedule
    vestingSchedule(id: ID!): VestingSchedule

    # Get claim history for a user
    claimHistory(
      userAddress: String!
      vaultId: ID
      pagination: PaginationInput
      sort: SortInput
    ): ClaimHistoryConnection!

    # Get vesting statistics
    vestingStatistics(
      organizationId: String
      dateRange: DateRange
    ): VestingStatistics!

    # Search vesting schedules
    searchVestingSchedules(
      query: String!
      userAddress: String
      pagination: PaginationInput
    ): VestingScheduleConnection!

    # Get upcoming milestones for a user
    upcomingMilestones(
      userAddress: String!
      daysAhead: Int = 30
    ): [VestingMilestone!]!

    # Get vesting performance analytics
    vestingAnalytics(
      userAddress: String!
      period: String = "30d" # 7d, 30d, 90d, 1y
    ): VestingAnalytics!
  }

  # Vesting analytics response
  type VestingAnalytics {
    period: String!
    startDate: Date!
    endDate: Date!
    
    # Claim analytics
    totalClaims: Int!
    totalClaimedAmount: BigDecimal!
    averageClaimAmount: BigDecimal!
    claimFrequency: Float! # claims per day
    
    # Vesting progress
    vestingProgressStart: Float!
    vestingProgressEnd: Float!
    vestingProgressChange: Float!
    
    # Value analytics
    totalValueUsd: BigDecimal!
    averageValuePerClaim: BigDecimal!
    
    # Trends
    dailyClaims: [DailyClaimData!]!
    cumulativeVesting: [CumulativeVestingData!]!
  }

  type DailyClaimData {
    date: Date!
    claimsCount: Int!
    amountClaimed: BigDecimal!
    valueUsd: BigDecimal!
  }

  type CumulativeVestingData {
    date: Date!
    cumulativeVested: BigDecimal!
    cumulativeClaimed: BigDecimal!
    progress: Float!
  }

  # Mutation extensions
  extend type Mutation {
    # Refresh vesting calculations (recalculate vested amounts)
    refreshVestingCalculations(vaultId: ID!): Boolean!

    # Mark milestone as completed
    completeMilestone(milestoneId: ID!): VestingMilestone!
  }
`;

module.exports = vestingTypeDefs;
