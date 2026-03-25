const PDFDocument = require('pdfkit');
const { Op } = require('sequelize');
const { ClaimsHistory } = require('../models');

class ReportService {
  async generateMonthlyClaimsPDF() {
    // 1. Fetch data
    const now = new Date();
    // Previous month start
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    // Previous month end (last day of previous month)
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const claims = await ClaimsHistory.findAll({
      where: {
        claim_timestamp: {
          [Op.between]: [start, end]
        }
      },
      order: [['claim_timestamp', 'ASC']]
    });

    // 2. Generate PDF
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Title
        doc.fontSize(20).text(`Monthly Claims Report`, { align: 'center' });
        doc.fontSize(14).text(`${start.toLocaleString('default', { month: 'long', year: 'numeric' })}`, { align: 'center' });
        doc.moveDown();

        if (claims.length === 0) {
          doc.fontSize(12).text('No claims found for this period.', { align: 'center' });
        } else {
          // Table Headers
          const tableTop = 150;
          const userX = 50;
          const tokenX = 200;
          const amountX = 350;
          const dateX = 450;

          doc.fontSize(10).font('Helvetica-Bold');
          doc.text('User Address', userX, tableTop);
          doc.text('Token Address', tokenX, tableTop);
          doc.text('Amount', amountX, tableTop);
          doc.text('Date', dateX, tableTop);
          
          doc.moveTo(userX, tableTop + 15).lineTo(550, tableTop + 15).stroke();

          let y = tableTop + 25;
          let totalTokens = 0;
          doc.font('Helvetica');

          for (const claim of claims) {
            if (y > 700) {
              doc.addPage();
              y = 50;
              // Reprint headers
              doc.fontSize(10).font('Helvetica-Bold');
              doc.text('User Address', userX, y);
              doc.text('Token Address', tokenX, y);
              doc.text('Amount', amountX, y);
              doc.text('Date', dateX, y);
              doc.moveTo(userX, y + 15).lineTo(550, y + 15).stroke();
              doc.font('Helvetica');
              y += 25;
            }

            const amount = parseFloat(claim.amount_claimed);
            totalTokens += amount;

            doc.fontSize(8).text(claim.user_address.substring(0, 15) + '...', userX, y);
            doc.text(claim.token_address.substring(0, 15) + '...', tokenX, y);
            doc.text(amount.toFixed(2), amountX, y);
            doc.text(new Date(claim.claim_timestamp).toLocaleDateString(), dateX, y);
            
            y += 20;
          }

          doc.moveDown();
          if (y > 700) {
             doc.addPage();
             y = 50;
          }
          doc.fontSize(12).font('Helvetica-Bold').text(`Total Tokens Claimed: ${totalTokens.toFixed(2)}`, userX, y + 20);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new ReportService();
