const { Vault, SubSchedule, Beneficiary, Organization, Notification, MilestoneCelebrationWebhook, GrantStream, FutureLien, LienRelease, LienMilestone } = require('../models');

// Setup model associations
Vault.hasMany(SubSchedule, {
  foreignKey: 'vault_id',
  as: 'subSchedules',
  onDelete: 'CASCADE',
});

SubSchedule.belongsTo(Vault, {
  foreignKey: 'vault_id',
  as: 'vault',
});

Vault.hasMany(Beneficiary, {
  foreignKey: 'vault_id',
  as: 'beneficiaries',
  onDelete: 'CASCADE',
});

Beneficiary.belongsTo(Vault, {
  foreignKey: 'vault_id',
  as: 'vault',
});

Beneficiary.hasMany(Notification, {
  foreignKey: 'beneficiary_id',
  as: 'notifications',
  onDelete: 'CASCADE',
});

Notification.belongsTo(Beneficiary, {
  foreignKey: 'beneficiary_id',
  as: 'beneficiary',
});

Notification.belongsTo(Vault, {
  foreignKey: 'vault_id',
  as: 'vault',
});

Notification.belongsTo(SubSchedule, {
  foreignKey: 'sub_schedule_id',
  as: 'subSchedule',
});

// Add associate methods to models
Vault.associate = function (models) {
  Vault.hasMany(models.SubSchedule, {
    foreignKey: 'vault_id',
    as: 'subSchedules',
  });

  Vault.hasMany(models.Beneficiary, {
    foreignKey: 'vault_id',
    as: 'beneficiaries',
  });

  Vault.belongsTo(models.Organization, {
    foreignKey: 'org_id',
    as: 'organization',
  });
};

Organization.associate = function (models) {
  Organization.hasMany(models.Vault, {
    foreignKey: 'org_id',
    as: 'vaults',
  });

  Organization.hasMany(models.MilestoneCelebrationWebhook, {
    foreignKey: 'organization_id',
    as: 'milestoneCelebrationWebhooks',
  });
};

SubSchedule.associate = function (models) {
  SubSchedule.belongsTo(models.Vault, {
    foreignKey: 'vault_id',
    as: 'vault',
  });
};

Beneficiary.associate = function (models) {
  Beneficiary.belongsTo(models.Vault, {
    foreignKey: 'vault_id',
    as: 'vault',
  });

  Beneficiary.hasMany(models.Notification, {
    foreignKey: 'beneficiary_id',
    as: 'notifications',
  });
};

Notification.associate = function (models) {
  Notification.belongsTo(models.Beneficiary, {
    foreignKey: 'beneficiary_id',
    as: 'beneficiary',
  });

  Notification.belongsTo(models.Vault, {
    foreignKey: 'vault_id',
    as: 'vault',
  });

  Notification.belongsTo(models.SubSchedule, {
    foreignKey: 'sub_schedule_id',
    as: 'subSchedule',
  });
};

MilestoneCelebrationWebhook.associate = function (models) {
  MilestoneCelebrationWebhook.belongsTo(models.Organization, {
    foreignKey: 'organization_id',
    as: 'organization'
  });
};

GrantStream.associate = function (models) {
  GrantStream.hasMany(models.FutureLien, {
    foreignKey: 'grant_stream_id',
    as: 'liens',
    onDelete: 'CASCADE',
  });
};

FutureLien.associate = function (models) {
  FutureLien.belongsTo(models.GrantStream, {
    foreignKey: 'grant_stream_id',
    as: 'grantStream',
  });

  FutureLien.belongsTo(models.Vault, {
    foreignKey: 'vault_address',
    targetKey: 'address',
    as: 'vault',
  });

  FutureLien.hasMany(models.LienRelease, {
    foreignKey: 'lien_id',
    as: 'releases',
    onDelete: 'CASCADE',
  });

  FutureLien.hasMany(models.LienMilestone, {
    foreignKey: 'lien_id',
    as: 'milestones',
    onDelete: 'CASCADE',
  });
};

LienRelease.associate = function (models) {
  LienRelease.belongsTo(models.FutureLien, {
    foreignKey: 'lien_id',
    as: 'lien',
  });
};

LienMilestone.associate = function (models) {
  LienMilestone.belongsTo(models.FutureLien, {
    foreignKey: 'lien_id',
    as: 'lien',
  });
};

module.exports = {
  Vault,
  SubSchedule,
  Beneficiary,
  Organization,
  Notification,
  MilestoneCelebrationWebhook,
  GrantStream,
  FutureLien,
  LienRelease,
  LienMilestone,
};
