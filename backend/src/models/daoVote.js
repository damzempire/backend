const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const DAOVote = sequelize.define('DAOVote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  proposal_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'dao_proposals',
      key: 'id',
    },
  },
  voter_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Wallet address of the voter',
  },
  vote_outcome: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    comment: 'True for YES, False for NO',
  },
  vote_weight: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 1.0,
  },
}, {
  tableName: 'dao_votes',
  timestamps: true,
  indexes: [
    { fields: ['voter_address'] },
    { fields: ['proposal_id'] },
  ],
});

DAOVote.associate = (models) => {
  DAOVote.belongsTo(models.DAOProposal, { foreignKey: 'proposal_id', as: 'proposal' });
};

module.exports = DAOVote;
