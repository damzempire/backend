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
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'organization_webhooks',
      indexes: [
        { fields: ['organization_id'] },
        { fields: ['webhook_url'] }
      ],
    }
  );
}

module.exports = { OrganizationWebhook, initOrganizationWebhookModel };
