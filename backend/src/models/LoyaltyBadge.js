const { DataTypes } = require("sequelize");
const { sequelize } = require("../database/connection");

const LoyaltyBadge = sequelize.define(
  "LoyaltyBadge",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    beneficiary_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "beneficiaries",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
      comment: "Reference to the beneficiary who earned this badge",
    },
    badge_type: {
      type: DataTypes.ENUM('diamond_hands', 'platinum_hodler', 'gold_holder', 'silver_holder'),
      allowNull: false,
      defaultValue: 'diamond_hands',
      comment: "Type of loyalty badge earned",
    },
    awarded_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: "Timestamp when the badge was awarded",
    },
    retention_period_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "Number of days the beneficiary maintained 100% retention",
    },
    initial_vested_amount: {
      type: DataTypes.DECIMAL(36, 18),
      allowNull: false,
      comment: "Initial amount of vested tokens when monitoring started",
    },
    current_balance: {
      type: DataTypes.DECIMAL(36, 18),
      allowNull: false,
      comment: "Current token balance at time of badge award",
    },
    nft_metadata_uri: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "URI to NFT metadata if badge is minted as NFT",
    },
    discord_role_granted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Flag indicating if Discord role was granted",
    },
    priority_access_granted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Flag indicating if priority access was granted",
    },
    monitoring_start_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "Date when balance monitoring started for this badge",
    },
    last_balance_check: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: "Last time the balance was checked",
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Flag indicating if the badge is still active",
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
    tableName: "loyalty_badges",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["beneficiary_id"],
      },
      {
        fields: ["badge_type"],
      },
      {
        fields: ["awarded_at"],
      },
      {
        fields: ["beneficiary_id", "badge_type"],
        unique: true,
      },
    ],
  },
);

LoyaltyBadge.associate = function (models) {
  LoyaltyBadge.belongsTo(models.Beneficiary, {
    foreignKey: 'beneficiary_id',
    as: 'beneficiary'
  });
};

module.exports = LoyaltyBadge;
