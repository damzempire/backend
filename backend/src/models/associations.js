const { Vault, SubSchedule, Beneficiary, Organization, Notification } = require('../models');

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
Vault.associate = function(models) {
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

Organization.associate = function(models) {
  Organization.hasMany(models.Vault, {
    foreignKey: 'org_id',
    as: 'vaults',
  });
};

SubSchedule.associate = function(models) {
  SubSchedule.belongsTo(models.Vault, {
    foreignKey: 'vault_id',
    as: 'vault',
  });
};

Beneficiary.associate = function(models) {
  Beneficiary.belongsTo(models.Vault, {
    foreignKey: 'vault_id',
    as: 'vault',
  });

  Beneficiary.hasMany(models.Notification, {
    foreignKey: 'beneficiary_id',
    as: 'notifications',
  });
};

Notification.associate = function(models) {
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

module.exports = {
  Vault,
  SubSchedule,
  Beneficiary,
  Organization,
  Notification,
};
