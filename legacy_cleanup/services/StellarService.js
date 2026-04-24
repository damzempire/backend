const StellarSdk = require('stellar-sdk');
const dotenv = require('dotenv');

dotenv.config();

class StellarService {
    constructor() {
        this.server = new StellarSdk.Server(process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org');
        this.auditAccountPublicKey = process.env.STELLAR_AUDIT_ACCOUNT_PUBLIC_KEY;
        this.auditAccountSecret = process.env.STELLAR_AUDIT_ACCOUNT_SECRET_KEY;
        
        if (!this.auditAccountPublicKey || !this.auditAccountSecret) {
            console.warn('Stellar audit account credentials not configured. Anchoring will be simulated.');
            this.simulationMode = true;
        } else {
            this.simulationMode = false;
        }
    }

    async anchorRootHash(rootHash, date) {
        try {
            if (this.simulationMode) {
                console.log(`[SIMULATION] Anchoring root hash for ${date}: ${rootHash}`);
                return {
                    success: true,
                    transactionId: `SIM_${Date.now()}_${rootHash.substring(0, 8)}`,
                    message: 'Simulated anchoring (no real Stellar transaction)'
                };
            }

            const account = await this.server.loadAccount(this.auditAccountPublicKey);
            const fee = await this.server.fetchBaseFee();
            
            const memo = `AUDIT:${date}:${rootHash}`;
            
            const transaction = new StellarSdk.TransactionBuilder(account, {
                fee: fee.toString(),
                networkPassphrase: StellarSdk.Networks.TESTNET
            })
                .addOperation(StellarSdk.Operation.payment({
                    destination: this.auditAccountPublicKey,
                    asset: StellarSdk.Asset.native(),
                    amount: '0.0000001'
                }))
                .addMemo(StellarSdk.Memo.text(memo))
                .setTimeout(30)
                .build();

            const keyPair = StellarSdk.Keypair.fromSecret(this.auditAccountSecret);
            transaction.sign(keyPair);

            const result = await this.server.submitTransaction(transaction);
            
            return {
                success: true,
                transactionId: result.id,
                message: `Root hash anchored to Stellar ledger`,
                ledger: result.ledger
            };

        } catch (error) {
            console.error('Error anchoring to Stellar:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to anchor root hash to Stellar ledger'
            };
        }
    }

    async verifyAnchoredTransaction(transactionId, expectedHash, date) {
        try {
            if (this.simulationMode && transactionId.startsWith('SIM_')) {
                return {
                    verified: true,
                    message: 'Simulated transaction verification'
                };
            }

            const transaction = await this.server.transactions().transaction(transactionId).call();
            const memo = transaction.memo;
            
            const expectedMemo = `AUDIT:${date}:${expectedHash}`;
            
            if (memo !== expectedMemo) {
                return {
                    verified: false,
                    message: `Memo mismatch. Expected: ${expectedMemo}, Found: ${memo}`
                };
            }

            return {
                verified: true,
                message: 'Transaction verified successfully',
                ledger: transaction.ledger,
                createdAt: transaction.created_at
            };

        } catch (error) {
            console.error('Error verifying Stellar transaction:', error);
            return {
                verified: false,
                error: error.message,
                message: 'Failed to verify transaction'
            };
        }
    }

    async getAccountInfo() {
        try {
            if (this.simulationMode) {
                return {
                    publicKey: this.auditAccountPublicKey || 'SIMULATED',
                    balance: '1000.0000000',
                    network: 'testnet-simulation'
                };
            }

            const account = await this.server.loadAccount(this.auditAccountPublicKey);
            const balance = account.balances.find(b => b.asset_type === 'native');
            
            return {
                publicKey: this.auditAccountPublicKey,
                balance: balance ? balance.balance : '0',
                network: 'testnet'
            };

        } catch (error) {
            console.error('Error getting account info:', error);
            return {
                error: error.message,
                publicKey: this.auditAccountPublicKey
            };
        }
    }
}

module.exports = StellarService;
