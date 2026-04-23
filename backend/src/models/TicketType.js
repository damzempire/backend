const { DataTypes } = require('sequelize');
const BaseModel = require('./BaseModel');

/**
 * TicketType model for managing ticket inventory
 * 
 * This model represents different types of tickets with inventory tracking
 * to prevent overselling through atomic reservation and release operations.
 */
module.exports = (sequelize) => {
  class TicketType extends BaseModel {
    static associate(models) {
      // Define associations here if needed
      // e.g., TicketType.hasMany(models.Ticket, { foreignKey: 'ticketTypeId' });
    }

    /**
     * Check if tickets are available for reservation
     * @param {number} quantity - Number of tickets to check
     * @returns {boolean} Whether the requested quantity is available
     */
    isAvailable(quantity) {
      return this.soldQuantity + quantity <= this.totalQuantity;
    }

    /**
     * Get remaining ticket count
     * @returns {number} Number of tickets remaining
     */
    getRemainingCount() {
      return this.totalQuantity - this.soldQuantity;
    }

    /**
     * Get availability percentage
     * @returns {number} Percentage of tickets still available (0-100)
     */
    getAvailabilityPercentage() {
      return this.totalQuantity > 0 
        ? ((this.totalQuantity - this.soldQuantity) / this.totalQuantity) * 100 
        : 0;
    }
  }

  TicketType.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Name of the ticket type',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Detailed description of the ticket type',
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Price per ticket',
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
        comment: 'Currency code for the price',
      },
      totalQuantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total number of tickets available for this type',
      },
      soldQuantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of tickets that have been sold/reserved',
      },
      maxPerUser: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Maximum number of tickets a single user can purchase',
      },
      saleStartDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When ticket sales start for this type',
      },
      saleEndDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When ticket sales end for this type',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this ticket type is currently active for sale',
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Additional metadata about the ticket type',
      },
      // Audit fields
      createdBy: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'User who created this ticket type',
      },
      updatedBy: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'User who last updated this ticket type',
      },
    },
    {
      sequelize,
      modelName: 'TicketType',
      tableName: 'ticket_types',
      timestamps: true,
      paranoid: true, // Soft deletes
      indexes: [
        {
          fields: ['name'],
          unique: true,
        },
        {
          fields: ['isActive'],
        },
        {
          fields: ['saleStartDate', 'saleEndDate'],
        },
        {
          fields: ['totalQuantity', 'soldQuantity'],
        },
      ],
      hooks: {
        beforeValidate: (ticketType) => {
          // Ensure soldQuantity never exceeds totalQuantity
          if (ticketType.soldQuantity > ticketType.totalQuantity) {
            throw new Error('Sold quantity cannot exceed total quantity');
          }
        },
        beforeUpdate: (ticketType) => {
          // Prevent negative quantities
          if (ticketType.soldQuantity < 0) {
            throw new Error('Sold quantity cannot be negative');
          }
          if (ticketType.totalQuantity < 0) {
            throw new Error('Total quantity cannot be negative');
          }
        },
      },
    }
  );

  return TicketType;
};
