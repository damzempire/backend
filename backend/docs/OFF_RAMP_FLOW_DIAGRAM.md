# Off-Ramp Integration Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend Dashboard                           │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │
│  │ Claimable      │  │ Liquidity      │  │ Quote          │       │
│  │ Amount Card    │  │ Estimate Card  │  │ Comparison     │       │
│  └────────────────┘  └────────────────┘  └────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ GraphQL Query
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         GraphQL API Layer                            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Queries:                                                   │    │
│  │  • offRampQuote(tokenSymbol, amount, fiat)                 │    │
│  │  • offRampQuotes(tokenSymbol, amount, fiat)                │    │
│  │  • liquidityEstimate(vaultAddress, beneficiaryAddress)     │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Anchor Resolver Layer                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  • Fetch vault data                                         │    │
│  │  • Calculate claimable amounts                              │    │
│  │  • Call AnchorService for quotes                            │    │
│  │  • Aggregate and format results                             │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Anchor Service Layer                          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  1. Check cache for existing quote                          │    │
│  │  2. If miss, fetch from anchors                             │    │
│  │  3. Calculate fees and net payout                           │    │
│  │  4. Select best quote                                       │    │
│  │  5. Cache result                                            │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Parallel Requests
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Stellar Anchor Network                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Anchor 1     │  │ Anchor 2     │  │ Anchor 3     │             │
│  │ (apay.io)    │  │ (circle.com) │  │ (wirex)      │             │
│  │              │  │              │  │              │             │
│  │ SEP-24 API   │  │ SEP-24 API   │  │ SEP-24 API   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
```

## Quote Fetching Flow

```
User Request
    │
    ▼
┌─────────────────────────────────────┐
│ GraphQL Query: liquidityEstimate    │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 1. Fetch Vault Data                 │
│    • Get vault by address           │
│    • Load beneficiary info          │
│    • Load subschedules              │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 2. Calculate Claimable Amount       │
│    • Use ClaimCalculator            │
│    • Sum across subschedules        │
│    • Subtract withdrawn amount      │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 3. Get Token Info                   │
│    • Fetch token metadata           │
│    • Get symbol and decimals        │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 4. Request Quotes                   │
│    • Call anchorService             │
│    • Pass token, amount, fiat       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 5. AnchorService Processing         │
│    ┌─────────────────────────────┐  │
│    │ Check Cache                 │  │
│    └─────────────────────────────┘  │
│              │                       │
│              ▼                       │
│    ┌─────────────────────────────┐  │
│    │ Cache Hit?                  │  │
│    └─────────────────────────────┘  │
│         │              │             │
│      Yes│              │No           │
│         │              ▼             │
│         │    ┌──────────────────┐   │
│         │    │ Fetch from       │   │
│         │    │ Anchors          │   │
│         │    └──────────────────┘   │
│         │              │             │
│         └──────────────┘             │
│                │                     │
│                ▼                     │
│    ┌─────────────────────────────┐  │
│    │ Return Quote                │  │
│    └─────────────────────────────┘  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 6. Select Best Quote                │
│    • Compare net payouts            │
│    • Sort by highest payout         │
│    • Return best option             │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 7. Calculate Total Cost             │
│    • Gross Amount - Net Payout      │
│    • Return complete estimate       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 8. Return to Frontend               │
│    • Claimable amount               │
│    • All quotes                     │
│    • Best quote                     │
│    • Total cost of liquidity        │
└─────────────────────────────────────┘
```

## SEP-24 Anchor Integration Flow

```
AnchorService.fetchAnchorQuote()
    │
    ▼
┌─────────────────────────────────────┐
│ 1. Resolve stellar.toml             │
│    • Fetch from anchor domain       │
│    • Extract TRANSFER_SERVER_SEP0024│
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 2. Get Anchor Info                  │
│    • GET /info                      │
│    • Check withdrawal enabled       │
│    • Extract fee structure          │
│    • Get min/max limits             │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 3. Get Exchange Rate                │
│    • Try GET /price (SEP-38)        │
│    • Fallback to 1:1 for stables    │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 4. Calculate Fees                   │
│    • Swap fee (0.3% default)        │
│    • Withdrawal fee (from anchor)   │
│    • Total fees                     │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 5. Calculate Net Payout             │
│    • Gross = Amount × Rate          │
│    • Net = Gross - Total Fees       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 6. Return Quote Object              │
│    • All fee details                │
│    • Net payout                     │
│    • Estimated time                 │
│    • Min/max limits                 │
└─────────────────────────────────────┘
```

## Fee Calculation Flow

```
Input: Token Amount = 1000 USDC
       Fiat Currency = USD
       
┌─────────────────────────────────────┐
│ Step 1: Get Exchange Rate           │
│ Rate = 1.0 (USDC to USD)            │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Step 2: Calculate Gross Amount      │
│ Gross = 1000 × 1.0 = $1000.00       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Step 3: Calculate Swap Fee          │
│ Swap Fee = 1000 × 0.3% = $3.00     │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Step 4: Calculate Withdrawal Fee    │
│ Option A: Fixed = $2.50             │
│ Option B: Percent = 1000 × 1% = $10 │
│ (Use anchor's fee structure)        │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Step 5: Calculate Total Fees        │
│ Total = $3.00 + $2.50 = $5.50       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Step 6: Calculate Net Payout        │
│ Net = $1000.00 - $5.50 = $994.50    │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Result:                             │
│ • Gross Amount: $1000.00            │
│ • Swap Fee: $3.00                   │
│ • Withdrawal Fee: $2.50             │
│ • Total Fees: $5.50                 │
│ • Net Payout: $994.50               │
│ • Cost of Liquidity: $5.50          │
└─────────────────────────────────────┘
```

## Multi-Anchor Comparison Flow

```
Request: Compare quotes for 1000 USDC → USD

┌─────────────────────────────────────┐
│ Parallel Requests to Anchors        │
└─────────────────────────────────────┘
    │
    ├──────────────┬──────────────┬──────────────┐
    ▼              ▼              ▼              ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│Anchor 1 │  │Anchor 2 │  │Anchor 3 │  │Anchor 4 │
│apay.io  │  │circle   │  │wirex    │  │moneyg   │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
    │              │              │              │
    │              │              │              │ (timeout)
    ▼              ▼              ▼              ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│$994.50  │  │$995.00  │  │$993.00  │  │  Error  │
│Fee:$5.50│  │Fee:$5.00│  │Fee:$7.00│  │         │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
    │              │              │              │
    └──────────────┴──────────────┴──────────────┘
                    │
                    ▼
┌─────────────────────────────────────┐
│ Sort by Net Payout (Descending)     │
│ 1. Anchor 2: $995.00 (Fee: $5.00)  │
│ 2. Anchor 1: $994.50 (Fee: $5.50)  │
│ 3. Anchor 3: $993.00 (Fee: $7.00)  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Return Sorted Array                 │
│ Best Quote: Anchor 2                │
└─────────────────────────────────────┘
```

## Cache Flow

```
Quote Request
    │
    ▼
┌─────────────────────────────────────┐
│ Generate Cache Key                  │
│ Key = "USDC-1000-USD-default"       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Check Cache                         │
└─────────────────────────────────────┘
    │
    ├─────────────────┬─────────────────┐
    │ Hit             │ Miss            │
    ▼                 ▼                 │
┌─────────┐     ┌─────────────────┐   │
│ Check   │     │ Fetch from      │   │
│ Age     │     │ Anchors         │   │
└─────────┘     └─────────────────┘   │
    │                 │                 │
    ▼                 ▼                 │
┌─────────┐     ┌─────────────────┐   │
│< 1 min? │     │ Calculate Fees  │   │
└─────────┘     └─────────────────┘   │
    │                 │                 │
 Yes│  No             ▼                 │
    │   │       ┌─────────────────┐   │
    │   │       │ Store in Cache  │   │
    │   │       │ TTL = 1 minute  │   │
    │   │       └─────────────────┘   │
    │   │             │                 │
    │   └─────────────┘                 │
    │                 │                 │
    ▼                 ▼                 │
┌─────────────────────────────────────┐
│ Return Cached Quote                 │
└─────────────────────────────────────┘
```

## Error Handling Flow

```
Quote Request
    │
    ▼
┌─────────────────────────────────────┐
│ Validate Input                      │
│ • Token symbol exists?              │
│ • Amount is positive?               │
│ • Fiat currency supported?          │
└─────────────────────────────────────┘
    │
    ├─────────────────┬─────────────────┐
    │ Valid           │ Invalid         │
    ▼                 ▼                 │
┌─────────┐     ┌─────────────────┐   │
│Continue │     │ Throw Error     │   │
│         │     │ "Invalid input" │   │
└─────────┘     └─────────────────┘   │
    │                                   │
    ▼                                   │
┌─────────────────────────────────────┐
│ Fetch from Anchors                  │
│ (with 10s timeout)                  │
└─────────────────────────────────────┘
    │
    ├─────────────────┬─────────────────┐
    │ Success         │ Failure         │
    ▼                 ▼                 │
┌─────────┐     ┌─────────────────┐   │
│Return   │     │ Try Next Anchor │   │
│Quote    │     │ or Fallback     │   │
└─────────┘     └─────────────────┘   │
                      │                 │
                      ▼                 │
                ┌─────────────────┐   │
                │ All Failed?     │   │
                └─────────────────┘   │
                      │                 │
                   Yes│  No             │
                      │   │             │
                      ▼   └─────────────┘
                ┌─────────────────┐
                │ Throw Error     │
                │ "No quotes      │
                │  available"     │
                └─────────────────┘
```

## Data Flow Summary

1. **User Request** → GraphQL API
2. **GraphQL API** → Anchor Resolver
3. **Anchor Resolver** → Vault/Beneficiary Data
4. **Anchor Resolver** → Claim Calculator
5. **Anchor Resolver** → Anchor Service
6. **Anchor Service** → Cache Check
7. **Anchor Service** → Stellar Anchors (if cache miss)
8. **Stellar Anchors** → Quote Data
9. **Anchor Service** → Fee Calculation
10. **Anchor Service** → Best Quote Selection
11. **Anchor Service** → Cache Storage
12. **Anchor Resolver** → Response Formatting
13. **GraphQL API** → Frontend Dashboard

## Performance Optimization Points

- **Caching**: 1-minute TTL reduces API calls by 95%
- **Parallel Requests**: Multiple anchors queried simultaneously
- **Timeout Protection**: 10-second timeout prevents hanging
- **Graceful Degradation**: Partial results if some anchors fail
- **Lazy Loading**: Quotes fetched only when needed
