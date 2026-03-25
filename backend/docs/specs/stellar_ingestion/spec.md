# Stellar Ingestion & Re-org Handling Specification

## Overview
This feature implements robust Stellar ledger ingestion with protection against network re-orgs (forks). It ensures that deposits (vault top-ups) and claims are not double-counted if the network reorganizes.

## Requirements
1.  **State Tracking**: Store the `last_ingested_ledger` sequence number in the database.
2.  **Re-org Detection**: Detect when the local chain tip diverges from the network (not applicable for simple forward-sync, but necessary for robustness).
3.  **Rollback Logic**: Ability to revert database changes (claims, deposits) that occurred after a specific ledger sequence.
4.  **Idempotency**: Ensure processing the same ledger twice does not result in duplicate data.

## Architecture

### Database Schema
New table `indexer_state` to track ingestion progress:
```sql
CREATE TABLE indexer_state (
  service_name VARCHAR(50) PRIMARY KEY,
  last_ingested_ledger BIGINT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Components
1.  **`src/services/stellarIngestionService.js`**:
    -   Manages the ingestion loop (polling or streaming).
    -   Checks for re-orgs (simulated or actual if using a horizon instance).
    -   Orchestrates the rollback process.
2.  **`src/models/indexerState.js`**: Sequelize model for `indexer_state`.
3.  **Rollback Methods**:
    -   `ClaimsHistory.destroy({ where: { block_number: { [Op.gt]: targetLedger } } })`
    -   `SubSchedule.destroy({ where: { block_number: { [Op.gt]: targetLedger } } })` (Note: `block_number` needs to be added to `SubSchedule` if missing).

## Data Flow
1.  **Ingestion**:
    -   Fetch next ledger from Stellar Horizon/RPC.
    -   Process transactions (deposits/claims).
    -   Update `indexer_state` with `last_ingested_ledger`.
    -   Commit transaction.

2.  **Re-org Handling (Rollback)**:
    -   If a re-org is detected (e.g., current ledger parent hash != stored last ledger hash - *advanced, for now we will implement the rollback mechanism triggered manually or by specific error*), or if we need to re-process:
    -   Call `rollbackToLedger(targetSequence)`.
    -   Delete all `ClaimsHistory` and `SubSchedule` records with `block_number > targetSequence`.
    -   Update `indexer_state` to `targetSequence`.

## Configuration
-   `STELLAR_HORIZON_URL`: URL of the Stellar Horizon instance.
-   `STARTING_LEDGER`: Ledger sequence to start ingestion from (if state is empty).
