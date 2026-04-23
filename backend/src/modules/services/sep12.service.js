const SEP12Fields = require('../utils/sep12-fields');

class SEP12Service {
  constructor(dbManager) {
    this.dbManager = dbManager;
  }

  async initialize() {
    // Initialize service
  }

  async getCustomerStatus(account, memo = null, memoType = null, type = null) {
    try {
      // Check if customer exists
      let customer;
      if (memo) {
        customer = await this.dbManager.query(
          'SELECT * FROM kyc_customers WHERE account = $1 AND memo = $2',
          [account, memo]
        );
      } else {
        customer = await this.dbManager.query(
          'SELECT * FROM kyc_customers WHERE account = $1 AND memo IS NULL',
          [account]
        );
      }

      if (customer.length === 0) {
        // Return required fields for new customer
        const requiredFields = this.getRequiredFieldsForType(type);
        return {
          status: 'NEEDS_INFO',
          fields: requiredFields
        };
      }

      // Get customer's fields
      const fields = await this.dbManager.query(
        'SELECT * FROM kyc_fields WHERE customer_id = $1',
        [customer[0].id]
      );

      return {
        id: customer[0].id,
        status: customer[0].status,
        provided_fields: this.formatProvidedFields(fields)
      };
    } catch (error) {
      throw new Error(`Failed to get customer status: ${error.message}`);
    }
  }

  async updateCustomer(customerData) {
    try {
      const { account, memo, memoType, type, ...fields } = customerData;
      
      // Create or find customer
      const customer = await this.findOrCreateCustomer(account, memo, memoType, type);
      
      // Process fields
      await this.processCustomerFields(customer.id, fields, type);
      
      // Return updated status
      return await this.getCustomerStatus(account, memo, memoType, type);
    } catch (error) {
      throw new Error(`Failed to update customer: ${error.message}`);
    }
  }

  getRequiredFieldsForType(type) {
    const fieldDefinitions = SEP12Fields.getFieldsByCustomerType(type);
    
    return Object.keys(fieldDefinitions).map(fieldName => ({
      description: fieldDefinitions[fieldName].description,
      type: fieldDefinitions[fieldName].type,
      optional: fieldDefinitions[fieldName].optional,
      choices: fieldDefinitions[fieldName].choices || undefined
    }));
  }

  async findOrCreateCustomer(account, memo, memoType, type) {
    try {
      // Try to find existing customer
      let existingCustomer;
      if (memo) {
        existingCustomer = await this.dbManager.query(
          'SELECT * FROM kyc_customers WHERE account = $1 AND memo = $2',
          [account, memo]
        );
      } else {
        existingCustomer = await this.dbManager.query(
          'SELECT * FROM kyc_customers WHERE account = $1 AND memo IS NULL',
          [account]
        );
      }

      if (existingCustomer.length > 0) {
        return existingCustomer[0];
      }

      // Create new customer
      const newCustomer = await this.dbManager.query(`
        INSERT INTO kyc_customers (account, memo, memo_type, type, status)
        VALUES ($1, $2, $3, $4, 'NEEDS_INFO')
        RETURNING *
      `, [account, memo, memoType, type]);

      return newCustomer[0];
    } catch (error) {
      throw new Error(`Failed to find or create customer: ${error.message}`);
    }
  }

  async processCustomerFields(customerId, fields, customerType) {
    try {
      const fieldDefinitions = SEP12Fields.getFieldsByCustomerType(customerType);

      for (const [fieldName, fieldValue] of Object.entries(fields)) {
        const fieldDef = fieldDefinitions[fieldName];
        if (!fieldDef) continue;

        // Validate field
        const validationErrors = SEP12Fields.validateField(fieldName, fieldValue, fieldDef.type);
        if (validationErrors.length > 0) {
          throw new Error(`Validation failed for ${fieldName}: ${validationErrors.join(', ')}`);
        }

        // Update field in database
        await this.dbManager.query(`
          INSERT INTO kyc_fields (customer_id, field_name, field_type, description, status, value, is_optional)
          VALUES ($1, $2, $3, $4, 'PROCESSING', $5, $6)
          ON CONFLICT (customer_id, field_name) 
          DO UPDATE SET 
            value = EXCLUDED.value,
            status = EXCLUDED.status,
            updated_at = CURRENT_TIMESTAMP
        `, [customerId, fieldName, fieldDef.type, fieldDef.description, fieldValue, fieldDef.optional]);
      }
    } catch (error) {
      throw new Error(`Failed to process customer fields: ${error.message}`);
    }
  }

  formatProvidedFields(fields) {
    const providedFields = {};
    fields.forEach(field => {
      providedFields[field.field_name] = {
        description: field.description,
        type: field.field_type,
        status: field.status
      };
    });
    return providedFields;
  }
}

module.exports = SEP12Service;
