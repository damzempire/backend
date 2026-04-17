const crypto = require('crypto');
const { ethers } = require('ethers');

// Test user addresses (these are valid Ethereum-style addresses for testing)
const TEST_ADDRESSES = [
  '0x742d35Cc6634C0532925a3b8D4C9db96C4b4Db45',
  '0x8ba1f109551bD432803012645Hac136c22C57B',
  '0x5aAeb6053f3E94C9b9A09f33669435E7Ef1BeAed',
  '0xfB6916095ca1df60bB79Ce92cE3EA74c37c5d359',
  '0xdbF03B407c01E7cD3CBea99509d93f8DDDC8C6FB',
  '0xD1220A0cf47c7B9Be7A2e6BA89F429762e7b9aDb',
  '0x78731D3Ca6b7E34aC0F824c42a7cC18A495cabaB',
  '0x617F2E2fD72FD9D5503197092aC168c91465E7f2',
  '0x17F6AD8Ef982297579C203069C1DbfE4348c372',
  '0x5c6B0f7Bf3E7ce046039Bd8FABdfD3f9F5021678'
];

// Generate a mock signature for testing
function generateMockSignature(address) {
  const message = `Login to Vesting Vault: ${address}:${Date.now()}`;
  const privateKey = '0x' + crypto.randomBytes(32).toString('hex');
  const wallet = new ethers.Wallet(privateKey);
  const signature = wallet.signMessage(message);
  return signature;
}

module.exports = {
  generateRandomUser: (userContext, events, done) => {
    const randomAddress = TEST_ADDRESSES[Math.floor(Math.random() * TEST_ADDRESSES.length)];
    const signature = generateMockSignature(randomAddress);
    
    userContext.vars.address = randomAddress;
    userContext.vars.signature = signature;
    
    return done();
  }
};
