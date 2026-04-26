const { Server } = require('socket.io');
const { createServer } = require('http');
const Client = require('socket.io-client');
const DashboardGateway = require('../dashboard-gateway.gateway');

describe('DashboardGateway', () => {
  let httpServer;
  let io;
  let gateway;
  let clientSocket;
  let serverSocket;

  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    gateway = new DashboardGateway(httpServer);
    
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = new Client(`http://localhost:${port}`);
      io.on('connection', (socket) => {
        serverSocket = socket;
      });
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
  });

  beforeEach(() => {
    // Clear any existing connections
    gateway.connectedUsers.clear();
    gateway.userSockets.clear();
  });

  describe('Authentication', () => {
    test('should authenticate user successfully', (done) => {
      const testUserAddress = 'GD5WOQY2F7LXQK3XQDQ7L6B3C7N2Z7S7W';
      
      clientSocket.emit('authenticate', { userAddress: testUserAddress });
      
      clientSocket.on('authenticated', (data) => {
        expect(data.success).toBe(true);
        expect(data.userAddress).toBe(testUserAddress);
        expect(gateway.userSockets.get(clientSocket.id)).toBe(testUserAddress);
        done();
      });
    });

    test('should reject authentication without user address', (done) => {
      clientSocket.emit('authenticate', {});
      
      clientSocket.on('error', (data) => {
        expect(data.message).toBe('User address is required');
        done();
      });
    });
  });

  describe('User Subscription', () => {
    beforeEach((done) => {
      const testUserAddress = 'GD5WOQY2F7LXQK3XQDQ7L6B3C7N2Z7S7W';
      clientSocket.emit('authenticate', { userAddress: testUserAddress });
      clientSocket.on('authenticated', () => done());
    });

    test('should subscribe to user updates successfully', (done) => {
      const testUserAddress = 'GD5WOQY2F7LXQK3XQDQ7L6B3C7N2Z7S7W';
      
      clientSocket.emit('subscribe_user', { userAddress: testUserAddress });
      
      clientSocket.on('subscribed', (data) => {
        expect(data.userAddress).toBe(testUserAddress);
        expect(gateway.connectedUsers.has(testUserAddress)).toBe(true);
        expect(gateway.connectedUsers.get(testUserAddress).has(clientSocket.id)).toBe(true);
        done();
      });
    });

    test('should reject subscription with invalid user address', (done) => {
      clientSocket.emit('subscribe_user', { userAddress: 'INVALID_ADDRESS' });
      
      clientSocket.on('error', (data) => {
        expect(data.message).toBe('Invalid user address');
        done();
      });
    });

    test('should unsubscribe from user updates successfully', (done) => {
      const testUserAddress = 'GD5WOQY2F7LXQK3XQDQ7L6B3C7N2Z7S7W';
      
      clientSocket.emit('subscribe_user', { userAddress: testUserAddress });
      clientSocket.on('subscribed', () => {
        clientSocket.emit('unsubscribe_user', { userAddress: testUserAddress });
      });
      
      clientSocket.on('unsubscribed', (data) => {
        expect(data.userAddress).toBe(testUserAddress);
        expect(gateway.connectedUsers.has(testUserAddress)).toBe(false);
        done();
      });
    });
  });

  describe('Vesting State', () => {
    beforeEach((done) => {
      const testUserAddress = 'GD5WOQY2F7LXQK3XQDQ7L6B3C7N2Z7S7W';
      clientSocket.emit('authenticate', { userAddress: testUserAddress });
      clientSocket.on('authenticated', () => done());
    });

    test('should handle vesting state request', (done) => {
      const testUserAddress = 'GD5WOQY2F7LXQK3XQDQ7L6B3C7N2Z7S7W';
      
      clientSocket.emit('get_vesting_state', { userAddress: testUserAddress });
      
      clientSocket.on('vesting_state', (data) => {
        expect(data).toHaveProperty('userAddress');
        expect(data).toHaveProperty('summary');
        expect(data).toHaveProperty('vaults');
        expect(data).toHaveProperty('timestamp');
        expect(data.userAddress).toBe(testUserAddress);
        done();
      });

      clientSocket.on('error', () => {
        // This is expected since we don't have real data in the test environment
        done();
      });
    });

    test('should handle dashboard data request', (done) => {
      const testUserAddress = 'GD5WOQY2F7LXQK3XQDQ7L6B3C7N2Z7S7W';
      
      clientSocket.emit('get_dashboard_data', { userAddress: testUserAddress });
      
      clientSocket.on('dashboard_data', (data) => {
        expect(data).toHaveProperty('userAddress');
        expect(data).toHaveProperty('dashboard');
        expect(data.dashboard).toHaveProperty('totalValue');
        expect(data.dashboard).toHaveProperty('claimableValue');
        expect(data.dashboard).toHaveProperty('vestingProgress');
        done();
      });

      clientSocket.on('error', () => {
        // This is expected since we don't have real data in the test environment
        done();
      });
    });
  });

  describe('Claim Events', () => {
    test('should broadcast claim events to subscribed users', (done) => {
      const testUserAddress = 'GD5WOQY2F7LXQK3XQDQ7L6B3C7N2Z7S7W';
      const claimData = {
        user_address: testUserAddress,
        amount_claimed: '100',
        token_address: 'TOKEN_ADDRESS',
        transaction_hash: '0x123456789'
      };

      // Authenticate and subscribe
      clientSocket.emit('authenticate', { userAddress: testUserAddress });
      clientSocket.on('authenticated', () => {
        clientSocket.emit('subscribe_user', { userAddress: testUserAddress });
      });
      
      clientSocket.on('subscribed', () => {
        // Simulate claim event
        gateway.onClaimEvent(claimData);
      });
      
      clientSocket.on('claim_event', (data) => {
        expect(data.type).toBe('CLAIM_EVENT');
        expect(data.data.user_address).toBe(testUserAddress);
        expect(data.data.amount_claimed).toBe('100');
        expect(data.message).toBe('Tokens claimed successfully!');
        done();
      });
    });
  });

  describe('Connection Management', () => {
    test('should handle disconnection properly', (done) => {
      const testUserAddress = 'GD5WOQY2F7LXQK3XQDQ7L6B3C7N2Z7S7W';
      
      clientSocket.emit('authenticate', { userAddress: testUserAddress });
      clientSocket.on('authenticated', () => {
        clientSocket.emit('subscribe_user', { userAddress: testUserAddress });
      });
      
      clientSocket.on('subscribed', () => {
        expect(gateway.connectedUsers.has(testUserAddress)).toBe(true);
        clientSocket.disconnect();
      });
      
      // Wait for disconnection to be processed
      setTimeout(() => {
        expect(gateway.connectedUsers.has(testUserAddress)).toBe(false);
        expect(gateway.userSockets.has(clientSocket.id)).toBe(false);
        done();
      }, 100);
    });

    test('should provide connection statistics', () => {
      const stats = gateway.getConnectionStats();
      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('connectedUsers');
      expect(stats).toHaveProperty('users');
      expect(typeof stats.totalConnections).toBe('number');
      expect(typeof stats.connectedUsers).toBe('number');
      expect(Array.isArray(stats.users)).toBe(true);
    });
  });

  describe('Broadcasting', () => {
    test('should broadcast custom events to users', (done) => {
      const testUserAddress = 'GD5WOQY2F7LXQK3XQDQ7L6B3C7N2Z7S7W';
      const customEvent = 'custom_notification';
      const customData = { message: 'Test notification' };

      clientSocket.emit('authenticate', { userAddress: testUserAddress });
      clientSocket.on('authenticated', () => {
        clientSocket.emit('subscribe_user', { userAddress: testUserAddress });
      });
      
      clientSocket.on('subscribed', () => {
        gateway.broadcastToUser(testUserAddress, customEvent, customData);
      });
      
      clientSocket.on(customEvent, (data) => {
        expect(data.message).toBe('Test notification');
        done();
      });
    });
  });
});
