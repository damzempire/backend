const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { AnnualVestingStatement, Vault, Beneficiary, Claim, SubSchedule, Sequelize } = require('../models');
const priceService = require('./backend/src/services/priceService');
const pdfService = require('./annualStatementPDFService');

/**
 * Service for managing professional annual vesting statements.
 * Provides aggregation, signing, and storage for bank-grade financial reporting.
 */
class AnnualVestingStatementService {
  /**
   * Generates a digitally signed annual statement for a beneficiary.
   */
  async generateStatement(userAddress, year) {
    // Check for existing statement to avoid unique constraint violations
    const existing = await AnnualVestingStatement.findOne({ 
      where: { userAddress, year } 
    });
    
    if (existing && !existing.isArchived) {
      return existing;
    }

    // 1. Aggregate financial data across all vaults
    const statementData = await this._aggregateFinancialData(userAddress, year);
    
    // 2. Generate the PDF document
    const pdfBuffer = await pdfService.generatePDF(statementData);
    
    // 3. Digital Signing using Transparency Key (Asymmetric Cryptography)
    const privateKey = process.env.TRANSPARENCY_PRIVATE_KEY;
    if (!privateKey) throw new Error('Transparency key not configured');

    const hash = crypto.createHash('sha256').update(pdfBuffer).digest();
    const signature = crypto.sign('sha256', hash, privateKey).toString('base64');
    
    // 4. Persistence to storage
    const fileName = `annual_statement_${userAddress}_${year}.pdf`;
    const storagePath = process.env.PDF_STORAGE_PATH || './storage/statements';
    if (!fs.existsSync(storagePath)) fs.mkdirSync(storagePath, { recursive: true });
    
    const filePath = path.join(storagePath, fileName);
    fs.writeFileSync(filePath, pdfBuffer);
    
    // 5. Audit record creation
    return await AnnualVestingStatement.create({
      userAddress,
      year,
      statementData,
      pdfFilePath: filePath,
      digitalSignature: signature,
      transparencyKeyPublicAddress: process.env.TRANSPARENCY_PUBLIC_KEY,
      ...this._extractSummary(statementData)
    });
  }

  /**
   * Internal helper to aggregate vesting, claims, and FMV data.
   */
  async _aggregateFinancialData(userAddress, year) {
    const startDate = new Date(`${year}-01-01T00:00:00Z`);
    const endDate = new Date(`${year}-12-31T23:59:59Z`);

    // 0. Find all vaults where the user is a beneficiary (critical for team members)
    const beneficiaryRecords = await Beneficiary.findAll({
      where: { address: userAddress },
      attributes: ['vault_id']
    });
    
    const vaultIds = beneficiaryRecords.map(b => b.vault_id);
    const userVaults = await Vault.findAll({ where: { id: vaultIds } });

    // 1. Fetch Cliffs reached this year
    const cliffsReached = await SubSchedule.findAll({
      where: {
        vault_id: vaultIds,
        start_timestamp: {
          [Sequelize.Op.between]: [startDate, endDate]
        }
      },
      include: [{ model: Vault, as: 'vault' }]
    });

    // Fetch all claims for this user in the specified year
    const claims = await Claim.findAll({
      where: {
        beneficiaryAddress: userAddress,
        timestamp: {
          [Sequelize.Op.between]: [startDate, endDate]
        }
      },
      include: [{ model: Vault, as: 'vault' }]
    });

    let totalClaimed = 0;
    let totalFMV = 0;

    const mappedClaims = await Promise.all(claims.map(async (claim) => {
      const amount = parseFloat(claim.amount);
      const priceAtUnlock = await priceService.getTokenPrice(claim.vault.token_address, claim.timestamp);
      const fmv = amount * (priceAtUnlock || 0);
      
      totalClaimed += amount;
      totalFMV += fmv;

      return {
        id: claim.id,
        timestamp: claim.timestamp,
        amount: claim.amount,
        vaultAddress: claim.vault.address,
        fmvAtUnlock: fmv.toFixed(2)
      };
    }));

    const mappedCliffs = await Promise.all(cliffsReached.map(async (cliff) => {
      const priceAtCliff = await priceService.getTokenPrice(cliff.vault.token_address, cliff.start_timestamp);
      const amount = parseFloat(cliff.top_up_amount);
      const fmvAtCliff = amount * (priceAtCliff || 0);
      
      return {
        timestamp: cliff.start_timestamp,
        vaultAddress: cliff.vault.address,
        amountUnlocked: cliff.top_up_amount,
        fmvAtCliff: fmvAtCliff.toFixed(2),
        event: 'Cliff Reached'
      };
    }));

    const totalVestedThisYear = mappedCliffs.reduce((acc, c) => acc + parseFloat(c.amountUnlocked), 0);
    const totalVestedFMV = mappedCliffs.reduce((acc, c) => acc + parseFloat(c.fmvAtCliff), 0);

    return {
      userAddress,
      year,
      generatedAt: new Date().toISOString(),
      claims: mappedClaims,
      milestones: mappedCliffs,
      auditInfo: {
        transparencyKey: process.env.TRANSPARENCY_PUBLIC_KEY,
        signingAlgorithm: 'RSASSA-PKCS1-v1_5-SHA256'
      },
      summary: {
        totalVestedAmount: totalVestedThisYear.toFixed(18),
        totalClaimedAmount: totalClaimed.toString(),
        totalUnclaimedAmount: (totalVestedThisYear - totalClaimed).toFixed(18), 
        totalFMVUSD: totalVestedFMV.toFixed(2),
        totalRealizedGainsUSD: totalFMV.toFixed(2), // Gains realized at point of unlock/claim
        numberOfVaults: userVaults.length,
        numberOfClaims: claims.length
      }
    };
  }

  _extractSummary(data) {
    return {
      ...data.summary
    };
  }
}

module.exports = new AnnualVestingStatementService();