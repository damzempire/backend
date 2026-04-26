const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const FutureLien = sequelize.define('FutureLien', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    vault_address: {
      type: DataTypes.STRING(42),
      allowNull: false,
      comment: 'Address of the vesting vault',
    },
    beneficiary_address: {
      type: DataTypes.STRING(42),
      allowNull: false,
      comment: 'Address of the beneficiary committing future tokens',
    },
    grant_stream_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'grant_streams',
        key: 'id',
      },
      onDelete: 'CASCADE',
      comment: 'ID of the grant stream receiving the commitment',
    },
    committed_amount: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      comment: 'Total amount of future tokens committed',
    },
    released_amount: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      comment: 'Amount already released to the grant',
    },
    vesting_start_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When vesting starts for the committed tokens',
    },
    vesting_end_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When vesting ends for the committed tokens',
    },
    cliff_date: {
      type: DataTypes.DATE,
      comment: 'Cliff date for vesting (if applicable)',
    },
    release_start_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When releases to the grant can start',
    },
    release_end_date: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'When releases to the grant must end',
    },
    release_rate_type: {
      type: DataTypes.ENUM('linear', 'milestone', 'immediate'),
      defaultValue: 'linear',
      comment: 'How tokens are released over time',
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'completed', 'cancelled'),
      defaultValue: 'pending',
      comment: 'Current status of the lien',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether the lien is currently active',
    },
    creation_transaction_hash: {
      type: DataTypes.STRING(66),
      comment: 'Transaction hash that created this lien',
    },
    contract_interaction_hash: {
      type: DataTypes.STRING(66),
      comment: 'Hash of contract interaction for lien creation',
    },
    last_released_at: {
      type: DataTypes.DATE,
      comment: 'Timestamp of the last release',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional lien metadata',
    },
  }, {
    tableName: 'future_liens',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['vault_address'] },
      { fields: ['beneficiary_address'] },
      { fields: ['grant_stream_id'] },
      { fields: ['status'] },
      { fields: ['is_active'] },
      { fields: ['release_start_date', 'release_end_date'] },
    ],
    scopes: {
      active: {
        where: {
          is_active: true,
          status: ['pending', 'active'],
        },
      },
      pending: {
        where: {
          status: 'pending',
        },
      },
      active: {
        where: {
          status: 'active',
        },
      },
    },
  });

  // Instance methods
  FutureLien.prototype.getRemainingAmount = function() {
    return parseFloat(this.committed_amount) - parseFloat(this.released_amount);
  };

  FutureLien.prototype.isWithinReleasePeriod = function(date = new Date()) {
    const checkDate = new Date(date);
    return checkDate >= this.release_start_date && checkDate <= this.release_end_date;
  };

  FutureLien.prototype.calculateAvailableForRelease = function(currentDate = new Date()) {
    if (!this.isWithinReleasePeriod(currentDate)) {
      return 0;
    }

    const remaining = this.getRemainingAmount();
    if (remaining <= 0) {
      return 0;
    }

    switch (this.release_rate_type) {
      case 'immediate':
        return remaining;
      
      case 'linear': {
        const totalDuration = this.release_end_date - this.release_start_date;
        const elapsed = currentDate - this.release_start_date;
        const progress = Math.max(0, Math.min(1, elapsed / totalDuration));
        return Math.min(remaining, remaining * progress);
      }
      
      case 'milestone':
        // Handled separately through milestone calculations
        return 0;
      
      default:
        return 0;
    }
  };

  return FutureLien;
};
