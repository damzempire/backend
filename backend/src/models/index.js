const { sequelize } = require("../database/connection");

const ClaimsHistory = require("./claimsHistory");
const Vault = require("./vault");
const SubSchedule = require("./subSchedule");
const TVL = require("./tvl");
const Beneficiary = require("./beneficiary");
const Organization = require("./organization");
const Notification = require("./notification");
const RefreshToken = require("./refreshToken");
const RevocationProposal = require("./revocationProposal");
const RevocationSignature = require("./revocationSignature");
const MultiSigConfig = require("./multiSigConfig");
const DividendRound = require("./dividendRound");
const DividendDistribution = require("./dividendDistribution");
const DividendSnapshot = require("./dividendSnapshot");
const DeviceToken = require("./deviceToken");
const VaultLegalDocument = require("./vaultLegalDocument");
const VaultLiquidityAlert = require("./vaultLiquidityAlert");
const VestingMilestone = require("./vestingMilestone");
const HistoricalTokenPrice = require("./historicalTokenPrice");
const CostBasisReport = require("./costBasisReport");
const AuditorToken = require("./auditorToken");

const { Token, initTokenModel } = require("./token");
const {
  OrganizationWebhook,
  initOrganizationWebhookModel,
} = require("./organizationWebhook");

initTokenModel(sequelize);

initOrganizationWebhookModel(sequelize);

const models = {
  ClaimsHistory,
  Vault,
  SubSchedule,
  TVL,
  Beneficiary,
  Organization,
  Notification,
  RefreshToken,
  DeviceToken,
  VaultLegalDocument,
  VaultLiquidityAlert,
  RevocationProposal,
  RevocationSignature,
  MultiSigConfig,
  DividendRound,
  DividendDistribution,
  DividendSnapshot,
  VestingMilestone,
  HistoricalTokenPrice,
  CostBasisReport,
  AuditorToken,
  DeviceToken,
  VaultLegalDocument,
  VaultLiquidityAlert,
  Token,
  OrganizationWebhook,
  sequelize,
};

// Setup associations

Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = models;
