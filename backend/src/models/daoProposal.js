const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const DAOProposal = sequelize.define('DAOProposal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  project_id: {
    type: DataTypes.INTEGER,
    // Note: References should be the table name, not the model name
    references: {
      model: 'grant_streams',
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'failed', 'cancelled'),
    defaultValue: 'active',
  },
  outcome_success: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether the project successfully achieved its milestones',
  },
}, {
  tableName: 'dao_proposals',
  timestamps: true,
});

DAOProposal.associate = (models) => {
  DAOProposal.belongsTo(models.GrantStream, { foreignKey: 'project_id', as: 'project' });
  DAOProposal.hasMany(models.DAOVote, { foreignKey: 'proposal_id', as: 'votes' });
};

module.exports = DAOProposal;
