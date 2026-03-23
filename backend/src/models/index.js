const { sequelize } = require('../database/connection');

const ClaimsHistory = require('./claimsHistory');
const Vault = require('./vault');
const SubSchedule = require('./subSchedule');
const TVL = require('./tvl');
const Beneficiary = require('./beneficiary');
const Organization = require('./organization');
const Notification = require('./notification');
const RefreshToken = require('./refreshToken');
const RevocationProposal = require('./revocationProposal');
const RevocationSignature = require('./revocationSignature');
const MultiSigConfig = require('./multiSigConfig');
const DeviceToken = require('./deviceToken');

const { Token, initTokenModel } = require('./token');
const { OrganizationWebhook, initOrganizationWebhookModel } = require('./organizationWebhook');



initTokenModel(sequelize);
initOrganizationWebhookModel(sequelize);


const models = {
  ClaimsHistory,
  Vault,
  SubSchedule,
  TVL,
  Beneficiary,
  Organization,
  RefreshToken,
  RevocationProposal,
  RevocationSignature,
  MultiSigConfig,
  Token,
  OrganizationWebhook,
  Notification,
  DeviceToken,

  sequelize,
};

// Setup associations
Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = models;
