const { Server, Transaction, Networks, Operation, Keypair, StrKey } = require('stellar-sdk');
const crypto = require('crypto');

/**
 * HSM Signer Gateway Service
 * 
 * Provides isolated signing capabilities for Stellar Soroban transactions
 * through Hardware Security Modules (AWS KMS, HashiCorp Vault, etc.)
 * 
 * Architecture:
 * 1. Backend prepares transaction XDR
 * 2. HSM Gateway signs transaction without exposing private keys
 * 3. Signed transaction is returned for broadcast
 */
class HSMGatewayService {
  constructor() {
    this.stellarServer = new Server(process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org');
    this.networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;
    this.hsmProvider = process.env.HSM_PROVIDER || 'aws-kms'; // aws-kms, hashicorp-vault, gcp-kms
    
    // Initialize HSM client
    this.hsmClient = this.initializeHSMClient();
    
    // Security settings
    this.maxTransactionAge = 300; // 5 minutes
    this.allowedOperations = ['invoke_contract_function', 'payment'];
  }

  /**
   * Initialize the appropriate HSM client based on provider
   */
  initializeHSMClient() {
    switch (this.hsmProvider) {
      case 'aws-kms':
        return new AWSKMSClient();
      case 'hashicorp-vault':
        return new HashiCorpVaultClient();
      case 'gcp-kms':
        return new GCPKMSClient();
      default:
        throw new Error(`Unsupported HSM provider: ${this.hsmProvider}`);
    }
  }

  /**
   * Prepare Soroban transaction XDR for HSM signing
   */
  async prepareRevocationTransaction(proposal, signatures) {
    try {
      // Validate proposal data
      this.validateProposal(proposal);

      // Get vault account information
      const vaultAccount = await this.stellarServer.loadAccount(proposal.vault_address);
      
      // Build Soroban contract invocation for revocation
      const transaction = await this.buildRevocationTransaction(proposal, vaultAccount);

      // Convert to XDR for HSM signing
      const transactionXDR = transaction.toXDR();
      
      // Create signing hash
      const transactionHash = this.hashTransaction(transaction);

      return {
        transactionXDR,
        transactionHash,
        networkPassphrase: this.networkPassphrase,
        proposalId: proposal.id,
        vaultAddress: proposal.vault_address,
        operations: transaction.operations.map(op => ({
          type: op.type,
          source: op.source
        }))
      };

    } catch (error) {
      console.error('❌ Error preparing revocation transaction:', error);
      throw new Error(`Transaction preparation failed: ${error.message}`);
    }
  }

  /**
   * Build the Stellar Soroban transaction for revocation
   */
  async buildRevocationTransaction(proposal, vaultAccount) {
    try {
      // This is a simplified example - actual implementation would depend on
      // the specific Soroban contract interface for revocation
      
      const contractId = process.env.REVOCATION_CONTRACT_ID;
      if (!contractId) {
        throw new Error('Revocation contract ID not configured');
      }

      // Build contract invocation arguments
      const args = [
        new StrKey.Address(proposal.beneficiary_address).toScVal(),
        // Amount would be converted to appropriate token representation
        // This depends on the token contract interface
      ];

      const operation = Operation.invokeContractFunction({
        contract: contractId,
        function: 'revoke',
        args: args,
        source: proposal.vault_address
      });

      // Create transaction
      const transaction = new TransactionBuilder(vaultAccount, {
        fee: '1000', // 0.0001 XLM
        networkPassphrase: this.networkPassphrase
      })
        .addOperation(operation)
        .setTimeout(30) // 30 seconds timeout
        .build();

      return transaction;

    } catch (error) {
      console.error('❌ Error building revocation transaction:', error);
      throw error;
    }
  }

  /**
   * Sign transaction using HSM
   */
  async signWithHSM(transactionXDR, keyId, signerAddress) {
    try {
      // Validate request
      this.validateSigningRequest(transactionXDR, keyId, signerAddress);

      // Parse transaction to verify it's valid
      const transaction = TransactionBuilder.fromXDR(transactionXDR, this.networkPassphrase);
      
      // Create transaction hash for signing
      const transactionHash = this.hashTransaction(transaction);

      // Sign using HSM
      const signature = await this.hsmClient.sign(transactionHash, keyId);

      // Verify signature matches expected signer
      const isValidSignature = this.verifySignature(signature, transactionHash, signerAddress);
      if (!isValidSignature) {
        throw new Error('HSM signature verification failed');
      }

      // Add signature to transaction
      transaction.addSignature(signerAddress, signature);

      return {
        signedTransactionXDR: transaction.toXDR(),
        signature: signature.toString('base64'),
        signerAddress,
        transactionHash: transactionHash.toString('hex')
      };

    } catch (error) {
      console.error('❌ Error signing with HSM:', error);
      throw new Error(`HSM signing failed: ${error.message}`);
    }
  }

  /**
   * Sign multi-sig transaction with multiple HSM keys
   */
  async signMultiSigTransaction(transactionXDR, signingRequests) {
    try {
      let transaction = TransactionBuilder.fromXDR(transactionXDR, this.networkPassphrase);
      const signatures = [];

      // Sign with each required signer
      for (const request of signingRequests) {
        const { keyId, signerAddress } = request;
        
        const signResult = await this.signWithHSM(
          transaction.toXDR(), 
          keyId, 
          signerAddress
        );

        transaction = TransactionBuilder.fromXDR(signResult.signedTransactionXDR, this.networkPassphrase);
        signatures.push(signResult);
      }

      return {
        signedTransactionXDR: transaction.toXDR(),
        signatures,
        isFullySigned: transaction.signatures.length >= this.getRequiredSignatures(transaction)
      };

    } catch (error) {
      console.error('❌ Error in multi-sig signing:', error);
      throw error;
    }
  }

  /**
   * Broadcast signed transaction to Stellar network
   */
  async broadcastTransaction(signedTransactionXDR) {
    try {
      const transaction = TransactionBuilder.fromXDR(signedTransactionXDR, this.networkPassphrase);
      
      // Submit to Stellar network
      const result = await this.stellarServer.submitTransaction(transaction);

      if (!result.successful) {
        throw new Error(`Transaction failed: ${result.resultXdr}`);
      }

      return {
        success: true,
        transactionHash: result.hash,
        ledger: result.ledger,
        feePaid: result.feeCharged,
        resultXdr: result.resultXdr
      };

    } catch (error) {
      console.error('❌ Error broadcasting transaction:', error);
      throw new Error(`Transaction broadcast failed: ${error.message}`);
    }
  }

  /**
   * Complete HSM signing flow for batch revoke
   */
  async executeBatchRevokeWithHSM(proposal, signingKeyIds) {
    try {
      console.log(`🔐 Starting HSM signing flow for proposal ${proposal.id}`);

      // Step 1: Prepare transaction
      const preparedTx = await this.prepareRevocationTransaction(proposal);
      console.log(`📝 Transaction prepared: ${preparedTx.transactionHash}`);

      // Step 2: Create signing requests
      const signingRequests = proposal.required_signers.map((signer, index) => ({
        keyId: signingKeyIds[signer],
        signerAddress: signer
      }));

      // Step 3: Sign with HSM
      const signedResult = await this.signMultiSigTransaction(
        preparedTx.transactionXDR,
        signingRequests
      );

      if (!signedResult.isFullySigned) {
        throw new Error('Insufficient signatures collected');
      }

      console.log(`✅ Transaction signed with ${signedResult.signatures.length} signatures`);

      // Step 4: Broadcast to network
      const broadcastResult = await this.broadcastTransaction(signedResult.signedTransactionXDR);
      
      console.log(`🚀 Transaction broadcast: ${broadcastResult.transactionHash}`);

      return {
        proposalId: proposal.id,
        transactionHash: broadcastResult.transactionHash,
        ledger: broadcastResult.ledger,
        signatures: signedResult.signatures.length,
        status: 'executed'
      };

    } catch (error) {
      console.error('❌ Batch revoke with HSM failed:', error);
      throw error;
    }
  }

  /**
   * Validate proposal data
   */
  validateProposal(proposal) {
    if (!proposal.id || !proposal.vault_address || !proposal.beneficiary_address) {
      throw new Error('Invalid proposal: missing required fields');
    }

    if (!this.isValidAddress(proposal.vault_address) || !this.isValidAddress(proposal.beneficiary_address)) {
      throw new Error('Invalid addresses in proposal');
    }

    if (proposal.status !== 'approved') {
      throw new Error('Proposal must be approved before execution');
    }
  }

  /**
   * Validate signing request
   */
  validateSigningRequest(transactionXDR, keyId, signerAddress) {
    if (!transactionXDR || !keyId || !signerAddress) {
      throw new Error('Invalid signing request: missing parameters');
    }

    if (!this.isValidAddress(signerAddress)) {
      throw new Error('Invalid signer address');
    }

    // Parse transaction to ensure it's valid XDR
    try {
      TransactionBuilder.fromXDR(transactionXDR, this.networkPassphrase);
    } catch (error) {
      throw new Error('Invalid transaction XDR');
    }
  }

  /**
   * Hash transaction for signing
   */
  hashTransaction(transaction) {
    return crypto.createHash('sha256').update(transaction.hash()).digest();
  }

  /**
   * Verify signature matches signer
   */
  verifySignature(signature, messageHash, signerAddress) {
    try {
      const keypair = Keypair.fromPublicKey(signerAddress);
      return keypair.verify(messageHash, signature);
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Get required signatures from transaction
   */
  getRequiredSignatures(transaction) {
    // This would depend on the transaction's source account and its multi-sig settings
    // For now, return a default
    return transaction.operations.length > 0 ? 2 : 1;
  }

  /**
   * Validate Stellar address format
   */
  isValidAddress(address) {
    if (!address || typeof address !== 'string') {
      return false;
    }

    // Stellar address format (G + 56 characters)
    if (address.startsWith('G') && address.length === 56) {
      return /^[G][a-zA-Z0-9]{55}$/.test(address);
    }

    return false;
  }

  /**
   * Get HSM provider status
   */
  async getHSMStatus() {
    try {
      const status = await this.hsmClient.getStatus();
      return {
        provider: this.hsmProvider,
        status: 'connected',
        ...status
      };
    } catch (error) {
      return {
        provider: this.hsmProvider,
        status: 'error',
        error: error.message
      };
    }
  }
}

/**
 * AWS KMS Client Implementation
 */
class AWSKMSClient {
  constructor() {
    this.AWS = require('aws-sdk');
    this.kms = new this.AWS.KMS({
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });
  }

  async sign(messageHash, keyId) {
    try {
      const params = {
        KeyId: keyId,
        Message: messageHash,
        MessageType: 'DIGEST',
        SigningAlgorithm: 'ECDSA_SHA_256'
      };

      const result = await this.kms.sign(params).promise();
      return result.Signature;
    } catch (error) {
      console.error('AWS KMS signing error:', error);
      throw error;
    }
  }

  async getStatus() {
    try {
      await this.kms.listKeys().promise();
      return { keys: 'accessible' };
    } catch (error) {
      throw new Error('AWS KMS connection failed');
    }
  }
}

/**
 * HashiCorp Vault Client Implementation
 */
class HashiCorpVaultClient {
  constructor() {
    this.vault = require('node-vault')({
      apiVersion: 'v1',
      endpoint: process.env.VAULT_ADDR || 'http://localhost:8200',
      token: process.env.VAULT_TOKEN
    });
  }

  async sign(messageHash, keyName) {
    try {
      const result = await this.vault.write(`transit/sign/${keyName}`, {
        hash_input: messageHash.toString('hex'),
        hash_algorithm: 'sha2-256',
        signature_algorithm: 'ecdsa'
      });

      return Buffer.from(result.data.signature, 'base64');
    } catch (error) {
      console.error('Vault signing error:', error);
      throw error;
    }
  }

  async getStatus() {
    try {
      await this.vault.health();
      return { status: 'healthy' };
    } catch (error) {
      throw new Error('Vault connection failed');
    }
  }
}

/**
 * GCP KMS Client Implementation
 */
class GCPKMSClient {
  constructor() {
    const { KeyManagementServiceClient } = require('@google-cloud/kms');
    this.client = new KeyManagementServiceClient();
    this.projectId = process.env.GCP_PROJECT_ID;
    this.locationId = process.env.GCP_LOCATION_ID || 'global';
    this.keyRingId = process.env.GCP_KEY_RING_ID;
  }

  async sign(messageHash, keyId) {
    try {
      const keyVersionName = this.client.cryptoKeyVersionPath(
        this.projectId,
        this.locationId,
        this.keyRingId,
        keyId,
        '1'
      );

      const [result] = await this.client.asymmetricSign({
        name: keyVersionName,
        digest: {
          sha256: messageHash
        }
      });

      return result.signature;
    } catch (error) {
      console.error('GCP KMS signing error:', error);
      throw error;
    }
  }

  async getStatus() {
    try {
      const keyRingName = this.client.keyRingPath(
        this.projectId,
        this.locationId,
        this.keyRingId
      );
      
      const [keyRing] = await this.client.getKeyRing({ name: keyRingName });
      return { keyRing: keyRing.name };
    } catch (error) {
      throw new Error('GCP KMS connection failed');
    }
  }
}

module.exports = new HSMGatewayService();
