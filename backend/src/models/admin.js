const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Admin = sequelize.define('Admin', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    address: {
      type: DataTypes.STRING(66), // Ethereum address length with 0x prefix
      allowNull: false,
      unique: true,
      validate: {
        is: /^0x[a-fA-F0-9]{40}$/ // Ethereum address format
      }
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    role: {
      type: DataTypes.ENUM('super_admin', 'admin', 'operator'),
      allowNull: false,
      defaultValue: 'admin'
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {
        // Default permissions for admin role
        can_create_vaults: true,
        can_revoke_access: true,
        can_transfer_vaults: true,
        can_topup_vaults: true,
        can_release_tokens: true,
        can_view_reports: true,
        can_manage_admins: false, // Only super_admin can manage admins
        can_access_hsm: false // HSM access requires explicit permission
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_by: {
      type: DataTypes.STRING(66),
      allowNull: true,
      references: {
        model: 'admins',
        key: 'address'
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'admins',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['address']
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['role']
      }
    ]
  });

  Admin.associate = (models) => {
    // Self-referential association for created_by
    Admin.belongsTo(models.Admin, {
      foreignKey: 'created_by',
      as: 'creator'
    });

    // An admin can create many other admins
    Admin.hasMany(models.Admin, {
      foreignKey: 'created_by',
      as: 'created_admins'
    });
  };

  // Instance methods
  Admin.prototype.hasPermission = function(permission) {
    if (!this.permissions) return false;
    return this.permissions[permission] === true;
  };

  Admin.prototype.grantPermission = function(permission) {
    if (!this.permissions) {
      this.permissions = {};
    }
    this.permissions[permission] = true;
    return this.save();
  };

  Admin.prototype.revokePermission = function(permission) {
    if (!this.permissions) {
      this.permissions = {};
    }
    this.permissions[permission] = false;
    return this.save();
  };

  Admin.prototype.updateLastLogin = function() {
    this.last_login = new Date();
    return this.save();
  };

  // Class methods
  Admin.findByAddress = function(address) {
    return this.findOne({
      where: { 
        address: address.toLowerCase(),
        is_active: true 
      }
    });
  };

  Admin.findActiveAdmins = function() {
    return this.findAll({
      where: { is_active: true },
      order: [['created_at', 'DESC']]
    });
  };

  Admin.findWithHSMPermissions = function() {
    return this.findAll({
      where: { 
        is_active: true,
        permissions: {
          can_access_hsm: true
        }
      }
    });
  };

  return Admin;
};
