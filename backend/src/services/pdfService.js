const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFService {
  constructor() {
    this.templatePath = path.join(__dirname, '../templates/vesting-agreement.html');
  }

  /**
   * Generate a PDF vesting agreement for a vault
   * @param {Object} vaultData - Vault and related data
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateVestingAgreement(vaultData) {
    return new Promise((resolve, reject) => {
      try {
        // Create a new PDF document
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        });

        // Collect PDF data in chunks
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate PDF content
        this.generatePDFContent(doc, vaultData);
        
        // Finalize the PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate PDF content using PDFKit
   * @param {PDFDocument} doc - PDFKit document instance
   * @param {Object} data - Vault data
   */
  generatePDFContent(doc, data) {
    const { 
      vault, 
      beneficiaries, 
      subSchedules, 
      organization,
      token 
    } = data;

    // Helper function for formatting
    const formatAddress = (address) => {
      if (!address) return 'N/A';
      return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    const formatDate = (date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatDuration = (seconds) => {
      if (!seconds) return 'N/A';
      const days = Math.floor(seconds / (24 * 60 * 60));
      const months = Math.floor(days / 30);
      const years = Math.floor(months / 12);
      
      if (years > 0) return `${years} year${years > 1 ? 's' : ''}`;
      if (months > 0) return `${months} month${months > 1 ? 's' : ''}`;
      return `${days} day${days > 1 ? 's' : ''}`;
    };

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('TOKEN VESTING AGREEMENT', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('Smart Contract-Based Token Distribution', { align: 'center' });
    doc.moveDown(2);

    // Date
    doc.fontSize(10).text(`Date: ${formatDate(new Date())}`, { align: 'right' });
    doc.moveDown();

    // Parties Section
    doc.fontSize(16).font('Helvetica-Bold').text('PARTIES');
    doc.fontSize(12).font('Helvetica');
    
    doc.text(`Company/Organization: ${organization?.name || 'N/A'}`);
    doc.text(`Beneficiary Address: ${beneficiaries[0]?.address ? formatAddress(beneficiaries[0].address) : 'N/A'}`);
    doc.moveDown();

    // Vault Details Section
    doc.fontSize(16).font('Helvetica-Bold').text('VAULT DETAILS');
    doc.fontSize(12).font('Helvetica');
    
    doc.text(`Vault Name: ${vault.name || 'Unnamed Vault'}`);
    doc.text(`Vault Address: ${formatAddress(vault.address)}`);
    doc.text(`Token Address: ${formatAddress(vault.token_address)}`);
    doc.text(`Total Allocation: ${this.formatNumber(vault.total_amount)} ${token?.symbol || 'TOKENS'}`);
    doc.moveDown();

    // Vesting Schedule Section
    doc.fontSize(16).font('Helvetica-Bold').text('VESTING SCHEDULE');
    doc.fontSize(12).font('Helvetica');

    if (subSchedules && subSchedules.length > 0) {
      const schedule = subSchedules[0]; // Use first schedule for primary agreement
      
      doc.text(`Vesting Start Date: ${formatDate(schedule.vesting_start_date)}`);
      doc.text(`Vesting Duration: ${formatDuration(schedule.vesting_duration)}`);
      doc.text(`Cliff Duration: ${formatDuration(schedule.cliff_duration)}`);
      doc.text(`Cliff End Date: ${formatDate(schedule.cliff_date)}`);
      
      // Calculate cliff release amount
      const cliffReleaseAmount = this.calculateCliffRelease(schedule);
      doc.text(`Cliff Release Amount: ${this.formatNumber(cliffReleaseAmount)} ${token?.symbol || 'TOKENS'}`);
    } else {
      doc.text('Vesting schedule information not available');
    }
    doc.moveDown();

    // Terms and Conditions Section
    doc.fontSize(16).font('Helvetica-Bold').text('TERMS AND CONDITIONS');
    doc.fontSize(12).font('Helvetica');

    const terms = [
      `1. Token Grant: The Company grants the Beneficiary ${this.formatNumber(vault.total_amount)} ${token?.symbol || 'TOKENS'} tokens subject to the vesting schedule outlined herein.`,
      '2. Vesting Period: The tokens will vest linearly over the specified duration starting from the vesting start date.',
      '3. Cliff Period: No tokens will be released before the cliff end date. Upon reaching the cliff date, the cliff release amount will become available.',
      '4. Linear Vesting: After the cliff period, tokens will vest continuously on a linear basis until fully vested.',
      '5. Smart Contract: This agreement is executed via a smart contract deployed on the blockchain. The terms are self-executing and immutable.',
      '6. Token Claims: The Beneficiary may claim vested tokens at any time through the smart contract interface.',
      '7. No Employment Guarantee: This agreement does not constitute an employment contract and does not guarantee continued employment or relationship with the Company.',
      '8. Governing Law: This agreement shall be governed by the laws of the jurisdiction specified in the smart contract.',
      '9. Risk Acknowledgment: The Beneficiary acknowledges understanding of blockchain technology, smart contract risks, and cryptocurrency volatility.',
      '10. Amendments: No amendments to this agreement are permitted except through mutually agreed-upon smart contract upgrades.'
    ];

    terms.forEach(term => {
      doc.text(term, { align: 'justify' });
      doc.moveDown(0.5);
    });

    // Blockchain References Section
    doc.fontSize(16).font('Helvetica-Bold').text('BLOCKCHAIN REFERENCES');
    doc.fontSize(12).font('Helvetica');
    
    doc.text(`Network: ${process.env.BLOCKCHAIN_NETWORK || 'Ethereum Mainnet'}`);
    doc.text(`Block Explorer: ${process.env.BLOCK_EXPLORER_URL || 'https://etherscan.io'}`);
    doc.text(`Vault Address: ${vault.address}`);
    
    if (subSchedules && subSchedules.length > 0) {
      doc.text(`Creation Transaction: ${subSchedules[0].transaction_hash || 'N/A'}`);
      doc.text(`Block Number: ${subSchedules[0].block_number || 'N/A'}`);
    }
    doc.moveDown();

    // Signature Section
    const currentY = doc.y;
    
    // Company signature
    doc.fontSize(12).font('Helvetica-Bold').text('Company Representative:', 50, currentY);
    doc.fontSize(10).font('Helvetica').text('_________________________', 50, currentY + 20);
    doc.text(`${organization?.name || 'Company Name'}`, 50, currentY + 40);
    
    // Beneficiary signature
    doc.fontSize(12).font('Helvetica-Bold').text('Beneficiary:', 350, currentY);
    doc.fontSize(10).font('Helvetica').text('_________________________', 350, currentY + 20);
    doc.text(`${beneficiaries[0]?.address ? formatAddress(beneficiaries[0].address) : 'Beneficiary'}`, 350, currentY + 40);

    // Footer
    doc.fontSize(8).font('Helvetica').text(
      'Important Notice: This is a legally binding agreement executed via smart contract. By interacting with the smart contract, all parties acknowledge and agree to these terms.',
      { align: 'center' }
    );
    
    doc.text(
      `Generated: ${formatDate(new Date())} | Vault ID: ${vault.id} | Agreement Version: 1.0`,
      { align: 'center' }
    );
  }

  /**
   * Calculate cliff release amount
   * @param {Object} schedule - Sub schedule data
   * @returns {string} Formatted cliff release amount
   */
  calculateCliffRelease(schedule) {
    if (!schedule) return '0';
    
    const totalDuration = schedule.vesting_duration || 0;
    const cliffDuration = schedule.cliff_duration || 0;
    const totalAmount = parseFloat(schedule.top_up_amount || 0);
    
    if (totalDuration === 0) return '0';
    
    const cliffPercentage = cliffDuration / totalDuration;
    const cliffAmount = totalAmount * cliffPercentage;
    
    return cliffAmount.toString();
  }

  /**
   * Format large numbers with commas
   * @param {string|number} amount - Amount to format
   * @returns {string} Formatted amount
   */
  formatNumber(amount) {
    if (!amount) return '0';
    
    const num = parseFloat(amount);
    if (isNaN(num)) return '0';
    
    // Handle very large numbers
    if (num >= 1e9) {
      return (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
      return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
      return (num / 1e3).toFixed(2) + 'K';
    }
    
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }

  /**
   * Stream PDF directly to response
   * @param {Object} vaultData - Vault data
   * @param {Object} res - Express response object
   */
  async streamVestingAgreement(vaultData, res) {
    try {
      const pdfBuffer = await this.generateVestingAgreement(vaultData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="vesting-agreement-${vaultData.vault.address}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      res.send(pdfBuffer);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new PDFService();
