const { DataTypes, Model } = require('sequelize');

class OrganizationWebhook extends Model {}

function initOrganizationWebhookModel(sequelize) {
  OrganizationWebhook.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      organization_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      webhook_url: {
        type: DataTypes.STRING(512),
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'organization_webhooks',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        { fields: ['organization_id'] },
        { fields: ['webhook_url'] }
      ],
    }
  );
}

OrganizationWebhook.associate = function associate(models) {
  OrganizationWebhook.belongsTo(models.Organization, {
    foreignKey: 'organization_id',
    as: 'organization',
  });

  OrganizationWebhook.hasMany(models.ClaimWebhookDelivery, {
    foreignKey: 'organization_webhook_id',
    as: 'claimWebhookDeliveries',
  });
};

module.exports = { OrganizationWebhook, initOrganizationWebhookModel };
