const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar Date

  type Vault {
    id: ID!
    address: String!
    name: String
    token_address: String!
    owner_address: String!
    total_amount: String!
    is_active: Boolean
    is_blacklisted: Boolean
    created_at: Date
    updated_at: Date
    org_id: String
    organization: Organization
    beneficiaries: [Beneficiary]
    subSchedules: [SubSchedule]
    summary: VaultSummary
  }

  type Organization {
    id: ID!
    name: String!
    admin_address: String!
    vaults: [Vault]
  }

  type Beneficiary {
    id: ID!
    address: String!
    vault_id: ID!
    total_allocated: String!
    total_withdrawn: String!
    created_at: Date
    updated_at: Date
    vault: Vault
    withdrawableAmount(withdrawableAt: Date): WithdrawableInfo
  }

  type SubSchedule {
    id: ID!
    vault_id: ID!
    top_up_amount: String!
    top_up_timestamp: Date
    cliff_duration: Int
    vesting_duration: Int
    vesting_start_date: Date
    start_timestamp: Date
    end_timestamp: Date
    transaction_hash: String
    block_number: Int
  }

  type VaultSummary {
    totalAllocated: String!
    totalWithdrawn: String!
    remainingAmount: String!
    activeBeneficiaries: Int!
    totalBeneficiaries: Int!
  }

  type WithdrawableInfo {
    totalWithdrawable: String!
    vestedAmount: String!
    remainingAmount: String!
    isFullyVested: Boolean!
    nextVestTime: Date
  }

  type ClaimsHistory {
    id: ID!
    user_address: String!
    token_address: String!
    amount_claimed: String!
    claim_timestamp: Date!
    transaction_hash: String!
    block_number: Int
    price_at_claim_usd: String
  }

  type RealizedGains {
    totalGains: String!
    claims: [ClaimsHistory]
    periodStart: Date
    periodEnd: Date
  }

  type OffRampQuote {
    anchorDomain: String!
    assetCode: String!
    inputAmount: String!
    fiatCurrency: String!
    exchangeRate: String!
    grossAmount: String!
    fees: QuoteFees!
    netPayout: String!
    estimatedTime: String
    minAmount: String
    maxAmount: String
    timestamp: String!
  }

  type QuoteFees {
    swapFee: String!
    swapFeePercent: Float!
    withdrawalFee: String!
    withdrawalFeeType: String!
    totalFees: String!
  }

  type LiquidityEstimate {
    tokenSymbol: String!
    claimableAmount: String!
    quotes: [OffRampQuote!]!
    bestQuote: OffRampQuote
    totalCostOfLiquidity: String!
  }

  input WithdrawInput {
    vaultAddress: String!
    beneficiaryAddress: String!
    amount: String!
  }

  input CreateVaultInput {
    address: String!
    name: String
    tokenAddress: String!
    ownerAddress: String!
    totalAmount: String!
  }

  input TopUpInput {
    vaultAddress: String!
    amount: String!
    cliffDuration: Int!
    vestingDuration: Int!
    transactionHash: String!
    blockNumber: Int
  }

  input ProcessClaimInput {
    userAddress: String!
    tokenAddress: String!
    amountClaimed: String!
    claimTimestamp: Date!
    transactionHash: String!
    blockNumber: Int
  }

  type Query {
    vault(address: String!, orgId: String, adminAddress: String): Vault
    vaults(orgId: String!, adminAddress: String!, first: Int, after: String): [Vault]
    vaultSummary(vaultAddress: String!): VaultSummary
    beneficiary(vaultAddress: String!, beneficiaryAddress: String!): Beneficiary
    beneficiaries(vaultAddress: String!, first: Int, after: String): [Beneficiary]
    claims(userAddress: String, tokenAddress: String, first: Int, after: String): [ClaimsHistory]
    claim(transactionHash: String!): ClaimsHistory
    realizedGains(userAddress: String!, startDate: Date, endDate: Date): RealizedGains
    offRampQuote(tokenSymbol: String!, tokenAmount: String!, fiatCurrency: String, anchorDomain: String): OffRampQuote
    offRampQuotes(tokenSymbol: String!, tokenAmount: String!, fiatCurrency: String): [OffRampQuote!]!
    liquidityEstimate(vaultAddress: String!, beneficiaryAddress: String!, fiatCurrency: String): LiquidityEstimate
  }

  type Mutation {
    createVault(input: CreateVaultInput!): Vault
    topUpVault(input: TopUpInput!): SubSchedule
    withdraw(input: WithdrawInput!): WithdrawableInfo
    processClaim(input: ProcessClaimInput!): ClaimsHistory
    processBatchClaims(claims: [ProcessClaimInput!]!): [ClaimsHistory]
    backfillMissingPrices: Int
  }
`;

module.exports = { typeDefs };
