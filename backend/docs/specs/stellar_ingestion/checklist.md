# Checklist

- [x] `indexer_state` table created via migration (Sequelize Model defined).
- [x] `IndexerState` model implemented.
- [x] `SubSchedule` model updated with `block_number`.
- [x] `StellarIngestionService` implemented.
- [x] `rollbackToLedger` successfully deletes "future" records.
- [x] `indexer_state` updates correctly after ingestion/rollback.
- [x] Unit tests passing for rollback scenarios.
