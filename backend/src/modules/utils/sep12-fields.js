class SEP12Fields {
  static getStandardFields() {
    return {
      first_name: {
        description: "The customer's first name",
        type: "string",
        optional: false,
      },
      last_name: {
        description: "The customer's last name",
        type: "string",
        optional: false,
      },
      email_address: {
        description: "The customer's email address",
        type: "string",
        optional: true,
      },
      mobile_number: {
        description: "Phone number of the customer",
        type: "string",
        optional: true,
      },
      address: {
        description: "Customer's residential address",
        type: "string",
        optional: false,
      },
      city: {
        description: "City of residence",
        type: "string",
        optional: false,
      },
      state_province: {
        description: "State or province of residence",
        type: "string",
        optional: false,
      },
      country: {
        description: "Country of residence (ISO 3166-1 alpha-3)",
        type: "string",
        optional: false,
        choices: ["USA", "GBR", "CAN", "AUS", "DEU", "FRA", "JPN", "CHN", "IND", "BRA"],
      },
      postal_code: {
        description: "Postal or ZIP code",
        type: "string",
        optional: false,
      },
      id_type: {
        description: "Government issued ID type",
        type: "string",
        optional: false,
        choices: ["Passport", "Drivers License", "State ID", "National ID"],
      },
      id_number: {
        description: "Government issued ID number",
        type: "string",
        optional: false,
      },
      id_expiration_date: {
        description: "Date when ID expires",
        type: "date",
        optional: false,
      },
      photo_id_front: {
        description: "A clear photo of the front of the government issued ID",
        type: "binary",
        optional: false,
      },
      birth_date: {
        description: "Customer's date of birth",
        type: "date",
        optional: false,
      },
      organization_name: {
        description: "Legal name of the organization",
        type: "string",
        optional: true,
      },
      organization_type: {
        description: "Type of organization",
        type: "string",
        optional: true,
        choices: ["Corporation", "LLC", "Partnership", "Sole Proprietorship", "Non-profit"],
      },
      registration_number: {
        description: "Business registration number",
        type: "string",
        optional: true,
      },
    };
  }

  static getFieldsByCustomerType(type) {
    const standardFields = this.getStandardFields();
    
    switch (type) {
      case 'sep31-sender':
        return {
          first_name: standardFields.first_name,
          last_name: standardFields.last_name,
          email_address: standardFields.email_address,
          birth_date: standardFields.birth_date,
          address: standardFields.address,
          city: standardFields.city,
          state_province: standardFields.state_province,
          country: standardFields.country,
          postal_code: standardFields.postal_code,
          id_type: standardFields.id_type,
          id_number: standardFields.id_number,
          id_expiration_date: standardFields.id_expiration_date,
          photo_id_front: standardFields.photo_id_front,
        };
      
      case 'counterparty_organization':
        return {
          organization_name: standardFields.organization_name,
          organization_type: standardFields.organization_type,
          registration_number: standardFields.registration_number,
          first_name: standardFields.first_name,
          last_name: standardFields.last_name,
          email_address: standardFields.email_address,
          mobile_number: standardFields.mobile_number,
        };
      
      default:
        return {
          first_name: standardFields.first_name,
          last_name: standardFields.last_name,
          email_address: standardFields.email_address,
          birth_date: standardFields.birth_date,
          address: standardFields.address,
          city: standardFields.city,
          state_province: standardFields.state_province,
          country: standardFields.country,
          postal_code: standardFields.postal_code,
          id_type: standardFields.id_type,
          id_number: standardFields.id_number,
          id_expiration_date: standardFields.id_expiration_date,
          photo_id_front: standardFields.photo_id_front,
        };
    }
  }

  static validateField(fieldName, value, fieldType) {
    const errors = [];

    switch (fieldType) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${fieldName} must be a string`);
        } else if (value.trim().length === 0) {
          errors.push(`${fieldName} cannot be empty`);
        }
        break;
      
      case 'number':
        if (isNaN(value)) {
          errors.push(`${fieldName} must be a number`);
        }
        break;
      
      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push(`${fieldName} must be a valid date`);
        }
        break;
      
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${fieldName} must be a boolean`);
        }
        break;
      
      case 'binary':
        if (!value && !value.buffer) {
          errors.push(`${fieldName} must be a file`);
        }
        break;
    }

    return errors;
  }
}

module.exports = SEP12Fields;
