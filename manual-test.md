# Manual Test Instructions for Issue #16

## 🧪 Test the Portfolio Endpoint

### **1. Start the Server**
```bash
node index.js
```
You should see: "Vesting API running on port 3000"

### **2. Test the Endpoint**
Open your browser or use curl to test:

**Browser Test:**
```
http://localhost:3000/api/user/0x1234567890abcdef1234567890abcdef12345678/portfolio
```

**Curl Test:**
```bash
curl http://localhost:3000/api/user/0x1234567890abcdef1234567890abcdef12345678/portfolio
```

### **3. Expected Response**
```json
{
  "total_locked": 100,
  "total_claimable": 20,
  "vaults": [
    { "type": "advisor", "locked": 80, "claimable": 15 },
    { "type": "investor", "locked": 20, "claimable": 5 }
  ],
  "address": "0x1234567890abcdef1234567890abcdef12345678"
}
```

### **4. Verify Acceptance Criteria**
✅ total_locked = 100  
✅ total_claimable = 20  
✅ Endpoint path = /api/user/:address/portfolio  
✅ Method = GET  

## 🎉 Test Results
- [ ] Server starts successfully
- [ ] Endpoint responds with correct data
- [ ] Response format matches requirements
- [ ] Acceptance criteria met
