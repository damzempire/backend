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
const AnnualVestingStatement = require("./annualVestingStatement");
const VestingMilestone = require("./vestingMilestone");
const HistoricalTokenPrice = require("./historicalTokenPrice");
const CostBasisReport = require("./costBasisReport");
const AuditorToken = require("./auditorToken");
const VaultRegistry = require("./vaultRegistry");
const Rule144Compliance = require("./rule144Compliance");
const TaxCalculation = require("./taxCalculation");
const TaxJurisdiction = require("./taxJurisdiction");
const KycStatus = require("./kycStatus");
const KycNotification = require("./kycNotification");
const ContractUpgradeProposal = require("./contractUpgradeProposal");
const ContractUpgradeSignature = require("./contractUpgradeSignature");
const ContractUpgradeAuditLog = require("./contractUpgradeAuditLog");
const CertifiedBuild = require("./certifiedBuild");

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
  Rule144Compliance,
  TaxCalculation,
  TaxJurisdiction,
  KycStatus,
  KycNotification,
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
  AnnualVestingStatement,
  Token,
  OrganizationWebhook,
  VaultRegistry,
  ContractUpgradeProposal,
  ContractUpgradeSignature,
  ContractUpgradeAuditLog,
  CertifiedBuild,
  sequelize,
};

// Setup associations

Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = models;
