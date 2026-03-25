# Tasks

1.  [x] Create migration for `indexer_state` table. (Handled via Sequelize sync in `models/index.js` but model definition created)
2.  [x] Create `src/models/indexerState.js` model.
3.  [x] Add `block_number` (ledger sequence) column to `SubSchedule` model/table if it doesn't exist (it exists in `ClaimsHistory`).
4.  [x] Create `src/services/stellarIngestionService.js` with:
    -   `getLastIngestedLedger()`
    -   `updateLastIngestedLedger(sequence)`
    -   `rollbackToLedger(sequence)`
5.  [x] Implement `rollbackToLedger` logic to delete records from `ClaimsHistory` and `SubSchedule` greater than the target ledger.
6.  [x] Add unit tests for `stellarIngestionService` specifically testing the rollback logic.
