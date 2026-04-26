const express = require('express');
const router = express.Router();
const LegalAgreement = require('../models/LegalAgreement');
const Investor = require('../models/Investor');

// Middleware to validate wallet address format
const validateWalletAddress = (req, res, next) => {
  const { walletAddress } = req.params;
  if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Invalid wallet address format' });
  }
  next();
};

// Get available languages
router.get('/languages', async (req, res) => {
  try {
    const languages = await LegalAgreement.getAvailableLanguages();
    res.json({ languages });
  } catch (error) {
    console.error('Error fetching languages:', error);
    res.status(500).json({ error: 'Failed to fetch languages' });
  }
});

// Create new agreement for investor
router.post('/agreements', async (req, res) => {
  try {
    const { walletAddress, email, name, version = '1.0' } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Find or create investor
    let investor = await Investor.findByWallet(walletAddress);
    if (!investor) {
      investor = await Investor.create(walletAddress, email, name);
    }

    // Create agreement
    const agreement = await LegalAgreement.createAgreement(investor.id, version);
    
    res.status(201).json({ 
      message: 'Agreement created successfully', 
      agreement,
      investor 
    });
  } catch (error) {
    console.error('Error creating agreement:', error);
    res.status(500).json({ error: 'Failed to create agreement' });
  }
});

// Add or update legal hash for specific language
router.post('/agreements/:agreementId/hashes', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { languageCode, content, isPrimary = false } = req.body;
    
    if (!languageCode || !content) {
      return res.status(400).json({ 
        error: 'Language code and content are required' 
      });
    }

    // Get language ID from code
    const languages = await LegalAgreement.getAvailableLanguages();
    const language = languages.find(lang => lang.code === languageCode);
    
    if (!language) {
      return res.status(400).json({ error: 'Invalid language code' });
    }

    // Add or update hash
    const hashRecord = await LegalAgreement.upsertLegalHash(
      agreementId, 
      language.id, 
      content, 
      isPrimary
    );
    
    res.status(200).json({ 
      message: 'Legal hash updated successfully', 
      hash: hashRecord 
    });
  } catch (error) {
    console.error('Error updating legal hash:', error);
    res.status(500).json({ error: 'Failed to update legal hash' });
  }
});

// Set primary language for agreement (digital signing)
router.post('/agreements/:agreementId/primary-language', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { languageCode, signerWallet, digitalSignature } = req.body;
    
    if (!languageCode || !signerWallet || !digitalSignature) {
      return res.status(400).json({ 
        error: 'Language code, signer wallet, and digital signature are required' 
      });
    }

    // Validate signer wallet format
    if (!/^0x[a-fA-F0-9]{40}$/.test(signerWallet)) {
      return res.status(400).json({ error: 'Invalid signer wallet address format' });
    }

    // Get language ID from code
    const languages = await LegalAgreement.getAvailableLanguages();
    const language = languages.find(lang => lang.code === languageCode);
    
    if (!language) {
      return res.status(400).json({ error: 'Invalid language code' });
    }

    // Set primary language with signing info
    const primaryHash = await LegalAgreement.setPrimaryLanguage(
      agreementId, 
      language.id, 
      signerWallet, 
      digitalSignature
    );
    
    if (!primaryHash) {
      return res.status(404).json({ error: 'Agreement or language hash not found' });
    }
    
    res.status(200).json({ 
      message: 'Primary language set successfully', 
      primaryHash 
    });
  } catch (error) {
    console.error('Error setting primary language:', error);
    res.status(500).json({ error: 'Failed to set primary language' });
  }
});

// Get all language hashes for an agreement
router.get('/agreements/:agreementId/hashes', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const hashes = await LegalAgreement.getAgreementHashes(agreementId);
    
    res.json({ 
      agreementId,
      hashes,
      totalLanguages: hashes.length,
      hasPrimary: hashes.some(h => h.is_primary)
    });
  } catch (error) {
    console.error('Error fetching agreement hashes:', error);
    res.status(500).json({ error: 'Failed to fetch agreement hashes' });
  }
});

// Get primary language hash for an agreement
router.get('/agreements/:agreementId/primary-hash', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const primaryHash = await LegalAgreement.getPrimaryHash(agreementId);
    
    if (!primaryHash) {
      return res.status(404).json({ error: 'No primary language set for this agreement' });
    }
    
    res.json({ primaryHash });
  } catch (error) {
    console.error('Error fetching primary hash:', error);
    res.status(500).json({ error: 'Failed to fetch primary hash' });
  }
});

// Verify hash integrity
router.post('/agreements/:agreementId/verify', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const { languageCode, content } = req.body;
    
    if (!languageCode || !content) {
      return res.status(400).json({ 
        error: 'Language code and content are required for verification' 
      });
    }

    // Get language ID from code
    const languages = await LegalAgreement.getAvailableLanguages();
    const language = languages.find(lang => lang.code === languageCode);
    
    if (!language) {
      return res.status(400).json({ error: 'Invalid language code' });
    }

    const verification = await LegalAgreement.verifyHash(agreementId, language.id, content);
    
    res.json({ 
      agreementId,
      languageCode,
      verification 
    });
  } catch (error) {
    console.error('Error verifying hash:', error);
    res.status(500).json({ error: 'Failed to verify hash' });
  }
});

// Get audit trail for an agreement
router.get('/agreements/:agreementId/audit', async (req, res) => {
  try {
    const { agreementId } = req.params;
    const auditTrail = await LegalAgreement.getAuditTrail(agreementId);
    
    res.json({ 
      agreementId,
      auditTrail,
      totalEntries: auditTrail.length
    });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({ error: 'Failed to fetch audit trail' });
  }
});

// Get investor's agreements
router.get('/investors/:walletAddress/agreements', validateWalletAddress, async (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const investor = await Investor.findByWallet(walletAddress);
    if (!investor) {
      return res.status(404).json({ error: 'Investor not found' });
    }

    const agreements = await LegalAgreement.getInvestorAgreements(investor.id);
    
    res.json({ 
      investor,
      agreements,
      totalAgreements: agreements.length
    });
  } catch (error) {
    console.error('Error fetching investor agreements:', error);
    res.status(500).json({ error: 'Failed to fetch investor agreements' });
  }
});

// Get comprehensive agreement details (for legal disputes)
router.get('/agreements/:agreementId/legal-details', async (req, res) => {
  try {
    const { agreementId } = req.params;
    
    // Get all hashes
    const hashes = await LegalAgreement.getAgreementHashes(agreementId);
    
    // Get primary hash
    const primaryHash = hashes.find(h => h.is_primary);
    
    // Get audit trail
    const auditTrail = await LegalAgreement.getAuditTrail(agreementId);
    
    // Get signing timeline
    const signingTimeline = auditTrail
      .filter(entry => entry.action === 'signed' || entry.action === 'primary_set')
      .map(entry => ({
        timestamp: entry.timestamp,
        language: entry.language_name,
        action: entry.action,
        signer: entry.changed_by,
        hash: entry.new_hash
      }));

    res.json({
      agreementId,
      legalStatus: {
        totalLanguages: hashes.length,
        hasPrimaryLanguage: !!primaryHash,
        primaryLanguage: primaryHash ? {
          language: primaryHash.language_name,
          code: primaryHash.language_code,
          signedAt: primaryHash.signed_at,
          signer: primaryHash.signer_wallet_address,
          hash: primaryHash.sha256_hash
        } : null,
        allLanguages: hashes.map(h => ({
          language: h.language_name,
          code: h.language_code,
          hash: h.sha256_hash,
          isPrimary: h.is_primary,
          signedAt: h.signed_at
        }))
      },
      signingTimeline,
      auditTrail: auditTrail.slice(0, 50), // Limit to recent entries
      lastUpdated: auditTrail.length > 0 ? auditTrail[0].timestamp : null
    });
  } catch (error) {
    console.error('Error fetching legal details:', error);
    res.status(500).json({ error: 'Failed to fetch legal details' });
  }
});

module.exports = router;
