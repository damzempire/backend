// backend/src/subscribers/pii_subscriber.js
const { EventSubscriber } = require('typeorm');
const { encrypt, decrypt } = require('../utils/encryption');

@EventSubscriber()
class PiiSubscriber {
  beforeInsert(event) {
    if (event.entity.full_name) event.entity.full_name = encrypt(event.entity.full_name);
    if (event.entity.tax_id) event.entity.tax_id = encrypt(event.entity.tax_id);
  }

  afterLoad(entity) {
    if (entity.full_name) entity.full_name = decrypt(entity.full_name);
    if (entity.tax_id) entity.tax_id = decrypt(entity.tax_id);
  }
}

module.exports = PiiSubscriber;
