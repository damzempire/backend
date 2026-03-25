const { sequelize } = require('../models');
const { TokenMetadataWorker } = require('../services/tokenMetadataWorker');

async function runWorker() {
  const worker = new TokenMetadataWorker(sequelize);
  await worker.detectAndFetchNewTokens();
  process.exit(0);
}

runWorker();
