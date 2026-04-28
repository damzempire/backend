const { DataTypes } = require("sequelize");
const { sequelize } = require("../database/connection");

const Beneficiary = sequelize.define(
  "Beneficiary",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    vault_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "vaults",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Beneficiary wallet address",
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Beneficiary email address",
      // Custom getter to decrypt the email when reading from the database
      get() {
        const rawValue = this.getDataValue("email");
        return rawValue
          ? require("../util/cryptoUtils").decryptEmail(rawValue)
          : null;
      },
      // Custom setter to encrypt the email before saving it to the database
      set(value) {
        this.setDataValue(
          "email",
          value ? require("../util/cryptoUtils").encryptEmail(value) : null,
        );
      },
      // Note: Removed validation check because the database will hold an encrypted string,
      // Validation is typically handled at the input layer before setting the model
    },
    email_valid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "Flag to indicate if email is valid (not bounced)",
    },
    total_allocated: {
      type: DataTypes.DECIMAL(36, 18),
      allowNull: false,
      defaultValue: 0,
      comment: "Total tokens allocated to this beneficiary",
    },
    total_withdrawn: {
      type: DataTypes.DECIMAL(36, 18),
      allowNull: false,
      defaultValue: 0,
      comment: "Total tokens withdrawn by this beneficiary",
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
    tableName: "beneficiaries",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["vault_id", "address"],
        unique: true,
      },
      {
        fields: ["address"],
      },
    ],
  },
);

Beneficiary.associate = function (models) {
  Beneficiary.belongsTo(models.Vault, {
    foreignKey: 'vault_id',
    as: 'vault'
  });
};

module.exports = Beneficiary;
