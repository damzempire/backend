const { DataTypes, Model } = require('sequelize');

class Token extends Model {}

function initTokenModel(sequelize) {
  Token.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      symbol: {
        type: DataTypes.STRING(32),
      },
      name: {
        type: DataTypes.STRING(128),
      },
      decimals: {
        type: DataTypes.INTEGER,
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
      tableName: 'tokens',
      indexes: [{ fields: ['address'] }],
    }
  );
}

module.exports = { Token, initTokenModel };
