# Vesting Agreement PDF Generation

This feature automatically generates professional legal PDF documents for token vesting agreements when vaults are created.

## Overview

The system creates comprehensive vesting agreements that map on-chain variables (duration, cliff, amount) to legally formatted documents, providing transparency and legal documentation for all vesting arrangements.

## Features

- **Professional Layout**: Clean, legal document format with proper sections
- **On-Chain Data Integration**: Automatically pulls vault, beneficiary, and schedule data
- **Smart Contract References**: Includes blockchain transaction details and addresses
- **Legal Terms**: Standard vesting agreement terms and conditions
- **Multiple Formats**: HTML template and PDF generation via PDFKit

## API Endpoint

### GET /api/vault/:id/agreement.pdf

Generates and returns a PDF vesting agreement for the specified vault.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Vault UUID |

#### Response

**Success (200 OK)**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="vesting-agreement-{vault-address}.pdf"`
- Body: PDF file stream

**Error Responses**
- `404 Not Found`: Vault not found
- `500 Internal Server Error`: PDF generation failed

#### Example Usage

```javascript
// Fetch vesting agreement PDF
const response = await fetch('/api/vault/123e4567-e89b-12d3-a456-426614174000/agreement.pdf');
const blob = await response.blob();

// Download the PDF
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'vesting-agreement.pdf';
a.click();
```

## PDF Document Structure

### 1. Header
- Document title: "Token Vesting Agreement"
- Subtitle: "Smart Contract-Based Token Distribution"
- Generation date

### 2. Parties Section
- Company/Organization name
- Beneficiary wallet address
- Vault identification

### 3. Vault Details
- Vault name and address
- Token contract address
- Total token allocation
- Token symbol

### 4. Vesting Schedule
- Vesting start date
- Total vesting duration
- Cliff duration
- Cliff end date
- Cliff release amount calculation

### 5. Terms and Conditions
Comprehensive legal terms including:
- Token grant details
- Vesting period specifications
- Cliff period terms
- Linear vesting explanation
- Smart contract execution
- Token claim procedures
- Employment disclaimers
- Governing law
- Risk acknowledgment
- Amendment restrictions

### 6. Blockchain References
- Network information
- Block explorer URLs
- Transaction hash
- Block number
- Smart contract address

### 7. Signature Section
- Company representative signature line
- Beneficiary signature line
- Digital acknowledgment notes

### 8. Footer
- Legal notices
- Generation metadata
- Document version

## Data Sources

The PDF generator pulls data from multiple database tables:

### Vault Model
```javascript
{
  id: string,
  address: string,
  name: string,
  token_address: string,
  owner_address: string,
  total_amount: string,
  org_id: string,
  created_at: Date,
  updated_at: Date
}
```

### Beneficiary Model
```javascript
{
  vault_id: string,
  address: string,
  email: string,
  total_allocated: string,
  total_withdrawn: string
}
```

### SubSchedule Model
```javascript
{
  vault_id: string,
  top_up_amount: string,
  cliff_duration: number,
  cliff_date: Date,
  vesting_start_date: Date,
  vesting_duration: number,
  start_timestamp: Date,
  end_timestamp: Date,
  transaction_hash: string,
  block_number: string
}
```

### Organization Model
```javascript
{
  id: string,
  name: string,
  logo_url: string,
  website_url: string,
  discord_url: string,
  admin_address: string
}
```

### Token Model
```javascript
{
  address: string,
  symbol: string,
  name: string,
  decimals: number
}
```

## Configuration

### Environment Variables

```bash
# Blockchain network information
BLOCKCHAIN_NETWORK=Ethereum Mainnet
BLOCK_EXPLORER_URL=https://etherscan.io

# PDF generation settings (optional)
PDF_MARGIN_TOP=50
PDF_MARGIN_BOTTOM=50
PDF_MARGIN_LEFT=50
PDF_MARGIN_RIGHT=50
```

## PDF Service Architecture

### PDFService Class

The `pdfService.js` provides the main functionality:

```javascript
class PDFService {
  async generateVestingAgreement(vaultData)
  async streamVestingAgreement(vaultData, res)
  generatePDFContent(doc, data)
  calculateCliffRelease(schedule)
  formatNumber(amount)
}
```

### Key Methods

- **generateVestingAgreement()**: Creates PDF buffer from vault data
- **streamVestingAgreement()**: Streams PDF directly to HTTP response
- **generatePDFContent()**: Builds PDF document structure
- **calculateCliffRelease()**: Calculates cliff release amounts
- **formatNumber()**: Formats large numbers with appropriate units

## HTML Template

The system includes an HTML template (`vesting-agreement.html`) that can be used for:
- Web-based agreement viewing
- Alternative PDF generation (Puppeteer)
- Email attachments
- Preview functionality

### Template Variables

The HTML template uses placeholder variables:
- `{{CURRENT_DATE}}`: Current date
- `{{ORGANIZATION_NAME}}`: Organization name
- `{{BENEFICIARY_ADDRESS}}`: Beneficiary wallet
- `{{VAULT_NAME}}`: Vault name
- `{{VAULT_ADDRESS}}`: Vault contract address
- `{{TOKEN_ADDRESS}}`: Token contract address
- `{{TOTAL_AMOUNT}}`: Total allocation
- `{{TOKEN_SYMBOL}}`: Token symbol
- And many more...

## Testing

### Running Tests

```bash
cd backend
node test-pdf-generation.js
```

### Test Coverage

The test script verifies:
- PDF generation from service
- HTTP endpoint functionality
- Error handling (invalid IDs, missing vaults)
- PDF file format validation
- Data integration accuracy

### Manual Testing

1. Create a test vault with beneficiaries and schedules
2. Access: `GET /api/vault/{vault-id}/agreement.pdf`
3. Verify PDF content and formatting
4. Check all data fields are populated correctly

## Error Handling

### Common Errors

1. **Vault Not Found**
   - Error: `404 Not Found`
   - Solution: Verify vault ID exists in database

2. **Missing Relationships**
   - Error: `500 Internal Server Error`
   - Solution: Ensure vault has required beneficiaries

3. **PDF Generation Failure**
   - Error: `500 Internal Server Error`
   - Solution: Check PDF service logs for details

### Logging

All PDF generation errors are logged with:
- Error message
- Vault ID
- Stack trace
- Request context

## Performance Considerations

- **PDF Generation**: ~500ms - 2s depending on data complexity
- **Memory Usage**: ~1-5MB per PDF generation
- **File Size**: ~50-200KB per generated PDF
- **Concurrent Requests**: Limited by server memory

## Security

- **Data Validation**: All inputs validated before processing
- **Access Control**: No authentication required (public vault data)
- **Rate Limiting**: Consider implementing for production
- **Input Sanitization**: All database fields sanitized

## Integration Examples

### Frontend Integration

```javascript
// React component for downloading agreement
const VestingAgreement = ({ vaultId }) => {
  const downloadAgreement = async () => {
    try {
      const response = await fetch(`/api/vault/${vaultId}/agreement.pdf`);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vesting-agreement-${vaultId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <button onClick={downloadAgreement}>
      Download Vesting Agreement
    </button>
  );
};
```

### Email Integration

```javascript
// Send agreement via email
const emailService = require('./services/emailService');

async function sendVestingAgreement(vaultId, recipientEmail) {
  try {
    const pdfBuffer = await pdfService.generateVestingAgreement(vaultData);
    
    await emailService.sendEmailWithAttachment(
      recipientEmail,
      'Your Token Vesting Agreement',
      'Please find your vesting agreement attached.',
      pdfBuffer,
      'vesting-agreement.pdf'
    );
  } catch (error) {
    console.error('Failed to send agreement:', error);
  }
}
```

## Future Enhancements

### Planned Features

1. **Multiple Templates**: Different agreement templates for different use cases
2. **Custom Branding**: Company logos and custom styling
3. **Digital Signatures**: Integrated digital signature functionality
4. **Batch Generation**: Generate agreements for multiple vaults
5. **Version Control**: Track agreement versions and changes
6. **Multi-language Support**: Agreements in multiple languages
7. **Advanced Formatting**: Tables, charts, and visual elements

### Technical Improvements

1. **Caching**: Cache generated PDFs for performance
2. **Async Processing**: Background PDF generation for large batches
3. **Template Engine**: Use Handlebars or similar for HTML templates
4. **PDF Optimization**: Smaller file sizes and faster generation
5. **Validation**: Enhanced data validation and error reporting

## Support

For issues or questions regarding PDF generation:
1. Check application logs for error details
2. Verify database relationships are properly set up
3. Ensure all required environment variables are configured
4. Test with the provided test script
