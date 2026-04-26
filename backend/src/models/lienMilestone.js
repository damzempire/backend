const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LienMilestone = sequelize.define('LienMilestone', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lien_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'future_liens',
        key: 'id',
      },
      onDelete: 'CASCADE',
      comment: 'ID of the parent lien',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Name of the milestone',
    },
    description: {
      type: DataTypes.TEXT,
      comment: 'Description of what this milestone represents',
    },
    target_date: {
      type: DataTypes.DATE,
      comment: 'Expected completion date for the milestone',
    },
    completion_date: {
      type: DataTypes.DATE,
      comment: 'Actual completion date',
    },
    percentage_of_total: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      comment: 'Percentage of total committed amount for this milestone',
    },
    is_completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Whether the milestone has been completed',
    },
    release_transaction_hash: {
      type: DataTypes.STRING(66),
      comment: 'Transaction hash when milestone funds were released',
    },
  }, {
    tableName: 'lien_milestones',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      { fields: ['lien_id'] },
      { fields: ['is_completed', 'target_date'] },
    ],
  });

  // Instance methods
  LienMilestone.prototype.calculateAmount = function(committedAmount) {
    return (parseFloat(committedAmount) * parseFloat(this.percentage_of_total)) / 100;
  };

  LienMilestone.prototype.markCompleted = function(transactionHash = null) {
    this.is_completed = true;
    this.completion_date = new Date();
    if (transactionHash) {
      this.release_transaction_hash = transactionHash;
    }
  };

  return LienMilestone;
};
