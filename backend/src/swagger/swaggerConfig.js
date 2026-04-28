/**
 * @swagger
 * tags:
 *   name: Vaults
 *   description: Vault management
 */

/**
 * @swagger
 * tags:
 *   name: Claims
 *   description: Claims processing
 */

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Administrative operations
 */

/**
 * @swagger
 * tags:
 *   name: Portfolio
 *   description: User portfolio management
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: Enter 'admin-token' or 'user-token' as the Bearer token for authentication
 *     XUserAddress:
 *       type: apiKey
 *       in: header
 *       name: x-user-address
 *       description: User wallet address for authentication (alternative to Bearer token)
 *   schemas:
 *     Vault:
 *       type: object
 *       required:
 *         - address
 *         - tokenAddress
 *         - ownerAddress
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated unique identifier
 *         address:
 *           type: string
 *           description: Smart contract address of the vault
 *         name:
 *           type: string
 *           description: Human-readable name for the vault
 *         tokenAddress:
 *           type: string
 *           description: Address of the token being vested
 *         ownerAddress:
 *           type: string
 *           description: Address of the vault owner
 *         totalAmount:
 *           type: string
 *           description: Total amount of tokens in the vault
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *       example:
 *         id: "550e8400-e29b-41d4-a716-446655440000"
 *         address: "0x1234567890123456789012345678901234567890"
 *         name: "Employee Vesting Vault"
 *         tokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
 *         ownerAddress: "0x1111111111111111111111111111111111111111"
 *         totalAmount: "10000"
 *         createdAt: "2024-01-01T00:00:00.000Z"
 *         updatedAt: "2024-01-01T00:00:00.000Z"
 * 
 *     Beneficiary:
 *       type: object
 *       required:
 *         - address
 *         - totalAllocated
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated unique identifier
 *         vaultId:
 *           type: string
 *           description: ID of the associated vault
 *         address:
 *           type: string
 *           description: Address of the beneficiary
 *         totalAllocated:
 *           type: string
 *           description: Total tokens allocated to the beneficiary
 *         totalWithdrawn:
 *           type: string
 *           description: Total tokens withdrawn by the beneficiary
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *       example:
 *         id: "550e8400-e29b-41d4-a716-446655440001"
 *         vaultId: "550e8400-e29b-41d4-a716-446655440000"
 *         address: "0x2222222222222222222222222222222222222222"
 *         totalAllocated: "5000"
 *         totalWithdrawn: "1000"
 *         createdAt: "2024-01-01T00:00:00.000Z"
 *         updatedAt: "2024-01-02T00:00:00.000Z"
 * 
 *     SubSchedule:
 *       type: object
 *       required:
 *         - vaultId
 *         - topUpAmount
 *         - cliffDuration
 *         - vestingDuration
 *         - startTimestamp
 *         - endTimestamp
 *         - transactionHash
 *         - blockNumber
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated unique identifier
 *         vaultId:
 *           type: string
 *           description: ID of the associated vault
 *         topUpAmount:
 *           type: string
 *           description: Amount added during the top-up
 *         cliffDuration:
 *           type: integer
 *           description: Duration of the cliff period in seconds
 *         vestingDuration:
 *           type: integer
 *           description: Duration of the vesting period in seconds
 *         startTimestamp:
 *           type: string
 *           format: date-time
 *           description: Start timestamp of the schedule
 *         endTimestamp:
 *           type: string
 *           format: date-time
 *           description: End timestamp of the schedule
 *         transactionHash:
 *           type: string
 *           description: Hash of the top-up transaction
 *         blockNumber:
 *           type: string
 *           description: Block number of the top-up transaction
 *         amountWithdrawn:
 *           type: string
 *           description: Amount already withdrawn from this schedule
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *       example:
 *         id: "550e8400-e29b-41d4-a716-446655440002"
 *         vaultId: "550e8400-e29b-41d4-a716-446655440000"
 *         topUpAmount: "2000"
 *         cliffDuration: 86400
 *         vestingDuration: 2592000
 *         startTimestamp: "2024-01-01T00:00:00.000Z"
 *         endTimestamp: "2024-02-01T00:00:00.000Z"
 *         transactionHash: "0xabc123..."
 *         blockNumber: "1234567"
 *         amountWithdrawn: "0"
 *         createdAt: "2024-01-01T00:00:00.000Z"
 *         updatedAt: "2024-01-01T00:00:00.000Z"
 * 
 *     Claim:
 *       type: object
 *       required:
 *         - userAddress
 *         - tokenAddress
 *         - amountClaimed
 *         - transactionHash
 *         - blockNumber
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated unique identifier
 *         userAddress:
 *           type: string
 *           description: Address of the user claiming tokens
 *         tokenAddress:
 *           type: string
 *           description: Address of the claimed token
 *         amountClaimed:
 *           type: string
 *           description: Amount of tokens claimed
 *         claimTimestamp:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the claim
 *         transactionHash:
 *           type: string
 *           description: Hash of the claim transaction
 *         blockNumber:
 *           type: string
 *           description: Block number of the claim transaction
 *         priceAtClaimUsd:
 *           type: string
 *           description: Price of the token at the time of claim in USD
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *       example:
 *         id: "550e8400-e29b-41d4-a716-446655440003"
 *         userAddress: "0x2222222222222222222222222222222222222222"
 *         tokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
 *         amountClaimed: "100"
 *         claimTimestamp: "2024-01-01T00:00:00.000Z"
 *         transactionHash: "0xdef456..."
 *         blockNumber: "1234568"
 *         priceAtClaimUsd: "1.50"
 *         createdAt: "2024-01-01T00:00:00.000Z"
 *         updatedAt: "2024-01-01T00:00:00.000Z"
 * 
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: object
 *           description: Response data
 *       example:
 *         success: true
 *         data: {}
 * 
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           description: Error message
 *           example: "Error message description"
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns a simple message confirming the API is running
 *     tags: [General]
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Vesting Vault API is running!"
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the service
 *     tags: [General]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-01T00:00:00.000Z"
 */

/**
 * @swagger
 * /api/claims:
 *   post:
 *     summary: Process a new claim
 *     description: Creates a record of a token claim
 *     tags: [Claims]
 *     security:
 *       - BearerAuth: []
 *       - XUserAddress: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userAddress
 *               - tokenAddress
 *               - amountClaimed
 *               - transactionHash
 *               - blockNumber
 *             properties:
 *               userAddress:
 *                 type: string
 *                 description: Address of the user claiming tokens
 *               tokenAddress:
 *                 type: string
 *                 description: Address of the token being claimed
 *               amountClaimed:
 *                 type: string
 *                 description: Amount of tokens being claimed
 *               claimTimestamp:
 *                 type: string
 *                 format: date-time
 *                 description: Timestamp of the claim (defaults to now)
 *               transactionHash:
 *                 type: string
 *                 description: Transaction hash of the claim
 *               blockNumber:
 *                 type: string
 *                 description: Block number of the claim transaction
 *               priceAtClaimUsd:
 *                 type: string
 *                 description: Price of the token at the time of claim in USD
 *             example:
 *               userAddress: "0x2222222222222222222222222222222222222222"
 *               tokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
 *               amountClaimed: "100"
 *               transactionHash: "0xdef456..."
 *               blockNumber: "1234568"
 *               priceAtClaimUsd: "1.50"
 *     responses:
 *       201:
 *         description: Claim processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               data:
 *                 id: "550e8400-e29b-41d4-a716-446655440003"
 *                 userAddress: "0x2222222222222222222222222222222222222222"
 *                 amountClaimed: "100"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/claims/batch:
 *   post:
 *     summary: Process multiple claims in batch
 *     description: Creates records for multiple token claims in a single request
 *     tags: [Claims]
 *     security:
 *       - BearerAuth: []
 *       - XUserAddress: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               claims:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - userAddress
 *                     - tokenAddress
 *                     - amountClaimed
 *                     - transactionHash
 *                     - blockNumber
 *                   properties:
 *                     userAddress:
 *                       type: string
 *                       description: Address of the user claiming tokens
 *                     tokenAddress:
 *                       type: string
 *                       description: Address of the token being claimed
 *                     amountClaimed:
 *                       type: string
 *                       description: Amount of tokens being claimed
 *                     claimTimestamp:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp of the claim (defaults to now)
 *                     transactionHash:
 *                       type: string
 *                       description: Transaction hash of the claim
 *                     blockNumber:
 *                       type: string
 *                       description: Block number of the claim transaction
 *                     priceAtClaimUsd:
 *                       type: string
 *                       description: Price of the token at the time of claim in USD
 *             example:
 *               claims:
 *                 - userAddress: "0x2222222222222222222222222222222222222222"
 *                   tokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
 *                   amountClaimed: "100"
 *                   transactionHash: "0xdef456..."
 *                   blockNumber: "1234568"
 *                   priceAtClaimUsd: "1.50"
 *                 - userAddress: "0x3333333333333333333333333333333333333333"
 *                   tokenAddress: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
 *                   amountClaimed: "200"
 *                   transactionHash: "0xghi789..."
 *                   blockNumber: "1234569"
 *                   priceAtClaimUsd: "1.55"
 *     responses:
 *       201:
 *         description: Batch claims processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     processedCount:
 *                       type: integer
 *                       example: 2
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           success:
 *                             type: boolean
 *                           claimId:
 *                             type: string
 *                           error:
 *                             type: string
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/claims/{userAddress}/realized-gains:
 *   get:
 *     summary: Get realized gains for a user
 *     description: Calculates and returns the realized gains for a specific user
 *     tags: [Claims]
 *     security:
 *       - BearerAuth: []
 *       - XUserAddress: []
 *     parameters:
 *       - in: path
 *         name: userAddress
 *         required: true
 *         schema:
 *           type: string
 *         description: Address of the user to get realized gains for
 *     responses:
 *       200:
 *         description: Realized gains retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     userAddress:
 *                       type: string
 *                       example: "0x2222222222222222222222222222222222222222"
 *                     realizedGains:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           tokenAddress:
 *                             type: string
 *                           totalClaimed:
 *                             type: string
 *                           totalValueUsd:
 *                             type: string
 *                           averagePriceUsd:
 *                             type: string
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/admin/revoke:
 *   post:
 *     summary: Revoke admin access
 *     description: Revokes administrative access for a specified address
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adminAddress
 *               - targetAddress
 *             properties:
 *               adminAddress:
 *                 type: string
 *                 description: Address of the admin initiating the revocation
 *               targetAddress:
 *                 type: string
 *                 description: Address of the admin to revoke
 *             example:
 *               adminAddress: "0x1234567890123456789012345678901234567890"
 *               targetAddress: "0x9876543210987654321098765432109876543210"
 *     responses:
 *       200:
 *         description: Admin access revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               data:
 *                 message: "Admin access revoked successfully"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/admin/create:
 *   post:
 *     summary: Create new admin
 *     description: Creates a new administrative user
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adminAddress
 *               - newAdminAddress
 *             properties:
 *               adminAddress:
 *                 type: string
 *                 description: Address of the admin initiating the creation
 *               newAdminAddress:
 *                 type: string
 *                 description: Address of the new admin to create
 *             example:
 *               adminAddress: "0x1234567890123456789012345678901234567890"
 *               newAdminAddress: "0x9876543210987654321098765432109876543210"
 *     responses:
 *       200:
 *         description: New admin created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               data:
 *                 message: "New admin created successfully"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/admin/transfer:
 *   post:
 *     summary: Transfer vault ownership
 *     description: Transfers ownership of a vault to a new address
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adminAddress
 *               - vaultAddress
 *               - newOwnerAddress
 *             properties:
 *               adminAddress:
 *                 type: string
 *                 description: Address of the admin initiating the transfer
 *               vaultAddress:
 *                 type: string
 *                 description: Address of the vault to transfer
 *               newOwnerAddress:
 *                 type: string
 *                 description: Address of the new owner
 *             example:
 *               adminAddress: "0x1234567890123456789012345678901234567890"
 *               vaultAddress: "0x1234567890123456789012345678901234567890"
 *               newOwnerAddress: "0x9876543210987654321098765432109876543210"
 *     responses:
 *       200:
 *         description: Vault ownership transferred successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               data:
 *                 message: "Vault ownership transferred successfully"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/admin/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     description: Retrieves audit logs for administrative actions
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of logs to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of logs to skip
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter logs before this date
 *       - in: query
 *         name: actionType
 *         schema:
 *           type: string
 *         description: Filter logs by action type
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           action:
 *                             type: string
 *                           actor:
 *                             type: string
 *                           target:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           details:
 *                             type: object
 *                     totalCount:
 *                       type: integer
 *                       example: 100
 *                     limit:
 *                       type: integer
 *                       example: 50
 *                     offset:
 *                       type: integer
 *                       example: 0
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/user/{address}/portfolio:
 *   get:
 *     summary: Get user portfolio
 *     description: Retrieves the portfolio summary for a specific user address
 *     tags: [Portfolio]
 *     security:
 *       - BearerAuth: []
 *       - XUserAddress: []
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Address of the user to get portfolio for
 *     responses:
 *       200:
 *         description: User portfolio retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_locked:
 *                   type: number
 *                   example: 100
 *                 total_claimable:
 *                   type: number
 *                   example: 15
 *                 vaults:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         example: "advisor"
 *                       locked:
 *                         type: number
 *                         example: 80
 *                       claimable:
 *                         type: number
 *                         example: 15
 *                 address:
 *                   type: string
 *                   example: "0x2222222222222222222222222222222222222222"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /graphql:
 *   get:
 *     summary: GraphQL Playground
 *     description: Access the GraphQL Playground interface for testing queries and mutations
 *     tags: [GraphQL]
 *     responses:
 *       200:
 *         description: GraphQL Playground interface
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               example: "<html>GraphQL Playground HTML content</html>"
 *   post:
 *     summary: Execute GraphQL operations
 *     description: Execute GraphQL queries, mutations, or subscriptions
 *     tags: [GraphQL]
 *     security:
 *       - BearerAuth: []
 *       - XUserAddress: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: GraphQL query, mutation, or subscription
 *                 example: "query { vault(address: \"0x...\") { id name address } }"
 *               variables:
 *                 type: object
 *                 description: Variables for the GraphQL operation
 *               operationName:
 *                 type: string
 *                 description: Name of the operation to execute
 *     responses:
 *       200:
 *         description: GraphQL operation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   description: Results of the GraphQL operation
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       message:
 *                         type: string
 *                       locations:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             line:
 *                               type: integer
 *                             column:
 *                               type: integer
 *                       path:
 *                         type: array
 *                         items:
 *                           type: string
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/org/{address}:
 *   get:
 *     summary: Get organization info by admin address
 *     description: Retrieves organization metadata (logo, website, discord) by admin address
 *     tags: [Organization]
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin address to retrieve organization info for
 *     responses:
 *       200:
 *         description: Organization info retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: Organization ID
 *                     name:
 *                       type: string
 *                       description: Organization name
 *                     logo_url:
 *                       type: string
 *                       description: URL to organization logo
 *                     website_url:
 *                       type: string
 *                       description: URL to organization website
 *                     discord_url:
 *                       type: string
 *                       description: URL to organization Discord
 *                     admin_address:
 *                       type: string
 *                       description: Admin address linked to this organization
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       description: Creation timestamp
 *                     updated_at:
 *                       type: string
 *                       format: date-time
 *                       description: Last update timestamp
 *             example:
 *               success: true
 *               data:
 *                 id: "550e8400-e29b-41d4-a716-446655440000"
 *                 name: "Acme Corp"
 *                 logo_url: "https://acme.com/logo.png"
 *                 website_url: "https://acme.com"
 *                 discord_url: "https://discord.gg/acme"
 *                 admin_address: "0x1234567890123456789012345678901234567890"
 *                 created_at: "2024-01-01T00:00:00.000Z"
 *                 updated_at: "2024-01-01T00:00:00.000Z"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Organization not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/vaults:
 *   post:
 *     summary: Create a new vault
 *     tags: [Vaults]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [address, token_address, owner_address]
 *             properties:
 *               address: { type: string }
 *               token_address: { type: string }
 *               owner_address: { type: string }
 *               name: { type: string }
 *               beneficiaries:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     address: { type: string }
 *                     allocation: { type: string }
 *     responses:
 *       201:
 *         description: Vault created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       500:
 *         description: Error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 * /api/vaults/{vaultAddress}/top-up:
 *   post:
 *     summary: Process a top-up
 *     tags: [Vaults]
 *     parameters:
 *       - in: path
 *         name: vaultAddress
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, transaction_hash]
 *             properties:
 *               amount: { type: string }
 *               transaction_hash: { type: string }
 *               cliff_duration_seconds: { type: integer }
 *               vesting_duration_seconds: { type: integer }
 *     responses:
 *       201:
 *         description: Top-up processed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       500:
 *         description: Error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 * /api/vaults/{vaultAddress}/schedule:
 *   get:
 *     summary: Get vesting schedule
 *     tags: [Vaults]
 *     parameters:
 *       - in: path
 *         name: vaultAddress
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Schedule retrieved
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *
 * /api/vaults/{vaultAddress}/{beneficiaryAddress}/withdrawable:
 *   get:
 *     summary: Get withdrawable amount
 *     tags: [Vaults]
 *     parameters:
 *       - in: path
 *         name: vaultAddress
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: beneficiaryAddress
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: timestamp
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Amount retrieved
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *
 * /api/vaults/{vaultAddress}/{beneficiaryAddress}/withdraw:
 *   post:
 *     summary: Process withdrawal
 *     tags: [Vaults]
 *     parameters:
 *       - in: path
 *         name: vaultAddress
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: beneficiaryAddress
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, transaction_hash]
 *             properties:
 *               amount: { type: string }
 *               transaction_hash: { type: string }
 *     responses:
 *       200:
 *         description: Withdrawal processed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       500:
 *         description: Error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 * /api/vaults/{vaultAddress}/summary:
 *   get:
 *     summary: Get vault summary
 *     tags: [Vaults]
 *     parameters:
 *       - in: path
 *         name: vaultAddress
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Summary retrieved
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *
 * /api/delegate/set:
 *   post:
 *     summary: Set delegate
 *     tags: [Vaults]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vaultId, ownerAddress, delegateAddress]
 *             properties:
 *               vaultId: { type: string }
 *               ownerAddress: { type: string }
 *               delegateAddress: { type: string }
 *     responses:
 *       200:
 *         description: Delegate set
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       500:
 *         description: Error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 * /api/delegate/claim:
 *   post:
 *     summary: Delegate claim
 *     tags: [Vaults]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [delegateAddress, vaultAddress, releaseAmount]
 *             properties:
 *               delegateAddress: { type: string }
 *               vaultAddress: { type: string }
 *               releaseAmount: { type: string }
 *     responses:
 *       200:
 *         description: Tokens claimed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       500:
 *         description: Error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 * /api/delegate/{vaultAddress}/info:
 *   get:
 *     summary: Get delegate info
 *     tags: [Vaults]
 *     parameters:
 *       - in: path
 *         name: vaultAddress
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Info retrieved
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *       500:
 *         description: Error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */

module.exports = {};