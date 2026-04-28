const { getDatabaseConnection } = require('../database/connection');
const { Model } = require('sequelize');

/**
 * Base Model class that automatically routes database operations
 * to the appropriate read/write database instance
 */
class BaseModel extends Model {
  /**
   * Override create method to use write database
   */
  static async create(values, options = {}) {
    const sequelize = getDatabaseConnection('create');
    const tempSequelize = this.sequelize;
    
    // Temporarily replace sequelize instance
    this.sequelize = sequelize;
    
    try {
      const result = await super.create(values, options);
      return result;
    } finally {
      // Restore original sequelize instance
      this.sequelize = tempSequelize;
    }
  }

  /**
   * Override bulkCreate method to use write database
   */
  static async bulkCreate(records, options = {}) {
    const sequelize = getDatabaseConnection('create');
    const tempSequelize = this.sequelize;
    
    this.sequelize = sequelize;
    
    try {
      const result = await super.bulkCreate(records, options);
      return result;
    } finally {
      this.sequelize = tempSequelize;
    }
  }

  /**
   * Override update method to use write database
   */
  static async update(values, options = {}) {
    const sequelize = getDatabaseConnection('update');
    const tempSequelize = this.sequelize;
    
    this.sequelize = sequelize;
    
    try {
      const result = await super.update(values, options);
      return result;
    } finally {
      this.sequelize = tempSequelize;
    }
  }

  /**
   * Override destroy method to use write database
   */
  static async destroy(options = {}) {
    const sequelize = getDatabaseConnection('delete');
    const tempSequelize = this.sequelize;
    
    this.sequelize = sequelize;
    
    try {
      const result = await super.destroy(options);
      return result;
    } finally {
      this.sequelize = tempSequelize;
    }
  }

  /**
   * Override find methods to use read database
   */
  static async findOne(options = {}) {
    const sequelize = getDatabaseConnection('read');
    const tempSequelize = this.sequelize;
    
    this.sequelize = sequelize;
    
    try {
      const result = await super.findOne(options);
      return result;
    } finally {
      this.sequelize = tempSequelize;
    }
  }

  static async findAll(options = {}) {
    const sequelize = getDatabaseConnection('read');
    const tempSequelize = this.sequelize;
    
    this.sequelize = sequelize;
    
    try {
      const result = await super.findAll(options);
      return result;
    } finally {
      this.sequelize = tempSequelize;
    }
  }

  static async findAndCountAll(options = {}) {
    const sequelize = getDatabaseConnection('read');
    const tempSequelize = this.sequelize;
    
    this.sequelize = sequelize;
    
    try {
      const result = await super.findAndCountAll(options);
      return result;
    } finally {
      this.sequelize = tempSequelize;
    }
  }

  static async findByPk(pk, options = {}) {
    const sequelize = getDatabaseConnection('read');
    const tempSequelize = this.sequelize;
    
    this.sequelize = sequelize;
    
    try {
      const result = await super.findByPk(pk, options);
      return result;
    } finally {
      this.sequelize = tempSequelize;
    }
  }

  static async count(options = {}) {
    const sequelize = getDatabaseConnection('read');
    const tempSequelize = this.sequelize;
    
    this.sequelize = sequelize;
    
    try {
      const result = await super.count(options);
      return result;
    } finally {
      this.sequelize = tempSequelize;
    }
  }

  /**
   * Instance methods for save and destroy
   */
  async save(options = {}) {
    const sequelize = getDatabaseConnection(this.isNewRecord ? 'create' : 'update');
    const tempSequelize = this.constructor.sequelize;
    
    this.constructor.sequelize = sequelize;
    
    try {
      const result = await super.save(options);
      return result;
    } finally {
      this.constructor.sequelize = tempSequelize;
    }
  }

  async destroy(options = {}) {
    const sequelize = getDatabaseConnection('delete');
    const tempSequelize = this.constructor.sequelize;
    
    this.constructor.sequelize = sequelize;
    
    try {
      const result = await super.destroy(options);
      return result;
    } finally {
      this.constructor.sequelize = tempSequelize;
    }
  }

  /**
   * Method to force read from master for consistency-critical operations
   */
  static async findOneFromMaster(options = {}) {
    const sequelize = getDatabaseConnection('write');
    const tempSequelize = this.sequelize;
    
    this.sequelize = sequelize;
    
    try {
      const result = await super.findOne(options);
      return result;
    } finally {
      this.sequelize = tempSequelize;
    }
  }

  /**
   * Raw query method with automatic routing
   */
  static async query(sql, options = {}) {
    const operation = options.type || (sql.toLowerCase().includes('select') ? 'read' : 'write');
    const sequelize = getDatabaseConnection(operation);
    
    return sequelize.query(sql, options);
  }

  /**
   * Transaction method that uses write database
   */
  static async transaction(options = {}) {
    const sequelize = getDatabaseConnection('write');
    return sequelize.transaction(options);
  }
}

module.exports = BaseModel;
