const { DataTypes } = require("sequelize");
const { sequelize } = require("../database/connection");

const AuditorToken = sequelize.define(
  "AuditorToken",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    token_hash: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    auditor_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    auditor_firm: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    org_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "organizations",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    issued_by: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Admin address that issued the auditor token",
    },
    scopes: {
      type: sequelize.getDialect() === "postgres"
        ? DataTypes.ARRAY(DataTypes.STRING)
        : DataTypes.JSON,
      allowNull: false,
      defaultValue: [
        "vesting_schedules",
        "withdrawal_history",
        "contract_hashes",
      ],
      get() {
        const val = this.getDataValue("scopes");
        if (typeof val === "string") {
          try { return JSON.parse(val); } catch { return []; }
        }
        return val || [];
      },
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    is_revoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    usage_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: "auditor_tokens",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["org_id"] },
      { fields: ["token_hash"] },
      { fields: ["expires_at"] },
    ],
  },
);

AuditorToken.associate = function (models) {
  AuditorToken.belongsTo(models.Organization, {
    foreignKey: "org_id",
    as: "organization",
  });
};

module.exports = AuditorToken;
