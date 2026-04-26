const { query } = require('./database');

class Investor {
  // Create a new investor
  static async create(walletAddress, email = null, name = null) {
    const text = `
      INSERT INTO investors (wallet_address, email, name)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await query(text, [walletAddress, email, name]);
    return result.rows[0];
  }

  // Find investor by wallet address
  static async findByWallet(walletAddress) {
    const text = 'SELECT * FROM investors WHERE wallet_address = $1';
    const result = await query(text, [walletAddress]);
    return result.rows[0];
  }

  // Get investor by ID
  static async findById(id) {
    const text = 'SELECT * FROM investors WHERE id = $1';
    const result = await query(text, [id]);
    return result.rows[0];
  }

  // Update investor information
  static async update(id, email = null, name = null) {
    const text = `
      UPDATE investors 
      SET email = COALESCE($2, email), 
          name = COALESCE($3, name), 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(text, [id, email, name]);
    return result.rows[0];
  }

  // Get all investors
  static async getAll(limit = 50, offset = 0) {
    const text = `
      SELECT * FROM investors 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await query(text, [limit, offset]);
    return result.rows;
  }

  // Delete investor (soft delete by updating status)
  static async delete(id) {
    const text = 'DELETE FROM investors WHERE id = $1';
    const result = await query(text, [id]);
    return result.rowCount > 0;
  }
}

module.exports = Investor;
