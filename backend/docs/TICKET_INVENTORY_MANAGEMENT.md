# Ticket Inventory Management with Atomic Operations

This document describes the implementation of atomic inventory reservation and release methods for the TicketTypesService, designed to prevent overselling through database-level locking.

## Overview

The ticket inventory system provides thread-safe operations for managing ticket sales with the following key features:

- **Atomic Operations**: Database-level locking prevents race conditions
- **Overselling Prevention**: Strict validation ensures sold quantity never exceeds total quantity
- **Transaction Support**: Optional QueryRunner parameter for use in larger transactions
- **Concurrent Safety**: Handles multiple simultaneous reservation requests correctly

## Architecture

### Components

1. **TicketType Model** (`src/models/TicketType.js`)
   - Defines ticket types with inventory tracking fields
   - Includes validation hooks and computed methods
   - Supports soft deletes and audit trails

2. **TicketTypesService** (`src/services/ticketTypes.service.js`)
   - Implements atomic reservation and release operations
   - Provides comprehensive inventory management methods
   - Supports both standalone and transaction-based operations

### Database Schema

```sql
CREATE TABLE ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  total_quantity INTEGER NOT NULL DEFAULT 0,
  sold_quantity INTEGER NOT NULL DEFAULT 0,
  max_per_user INTEGER,
  sale_start_date TIMESTAMP,
  sale_end_date TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSON,
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  
  CONSTRAINT check_sold_quantity CHECK (sold_quantity >= 0),
  CONSTRAINT check_total_quantity CHECK (total_quantity >= 0),
  CONSTRAINT check_sold_not_exceed_total CHECK (sold_quantity <= total_quantity)
);

CREATE INDEX idx_ticket_types_name ON ticket_types(name);
CREATE INDEX idx_ticket_types_active ON ticket_types(is_active);
CREATE INDEX idx_ticket_types_sale_dates ON ticket_types(sale_start_date, sale_end_date);
CREATE INDEX idx_ticket_types_inventory ON ticket_types(total_quantity, sold_quantity);
```

## Core Operations

### reserveTickets(ticketTypeId, quantity, queryRunner?)

**Purpose**: Atomically reserve tickets to prevent overselling

**Key Features**:
- Uses `SELECT ... FOR UPDATE` to lock the database row
- Validates availability before reservation
- Supports optional QueryRunner for transaction integration
- Throws descriptive exceptions for error cases

**Implementation**:
```javascript
// Lock the row for update
const ticketType = await TicketType.findOne({
  where: { id: ticketTypeId, isActive: true },
  lock: true, // FOR UPDATE lock
  transaction,
});

// Validate availability
if (ticketType.soldQuantity + quantity > ticketType.totalQuantity) {
  throw new BadRequestException('Insufficient tickets available');
}

// Atomic update
await ticketType.update({ soldQuantity: newSoldQuantity }, { transaction });
```

**Usage Examples**:
```javascript
// Simple reservation
const result = await ticketTypesService.reserveTickets('ticket-id', 5);

// Within larger transaction
const queryRunner = sequelize.createQueryRunner();
await queryRunner.startTransaction();
try {
  await ticketTypesService.reserveTickets('ticket-id', 5, queryRunner);
  // Other operations...
  await queryRunner.commitTransaction();
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
}
```

### releaseTickets(ticketTypeId, quantity, queryRunner?)

**Purpose**: Atomically release tickets back to inventory

**Key Features**:
- Prevents sold quantity from going below zero
- Uses same locking mechanism as reservation
- Supports transaction integration
- Comprehensive validation

**Implementation**:
```javascript
// Lock the row for update
const ticketType = await TicketType.findOne({
  where: { id: ticketTypeId },
  lock: true,
  transaction,
});

// Validate release quantity
if (ticketType.soldQuantity - quantity < 0) {
  throw new BadRequestException('Cannot release more tickets than sold');
}

// Atomic update
await ticketType.update({ soldQuantity: newSoldQuantity }, { transaction });
```

## Error Handling

### Exception Types

1. **BadRequestException**
   - Insufficient tickets available
   - Invalid quantity values
   - Attempt to release more than sold
   - Business logic violations

2. **NotFoundException**
   - Ticket type not found
   - Inactive ticket type access

3. **Generic Errors**
   - Database connection issues
   - Transaction failures
   - Unexpected system errors

### Error Response Format

```javascript
{
  name: 'BadRequestException',
  message: 'Insufficient tickets available. Requested: 10, Available: 5',
  details: {
    requested: 10,
    available: 5,
    totalQuantity: 100,
    soldQuantity: 95
  }
}
```

## Concurrency Management

### Database Locking Strategy

The implementation uses pessimistic locking with `SELECT ... FOR UPDATE`:

```sql
-- This query locks the row until the transaction commits/rolls back
SELECT * FROM ticket_types WHERE id = $1 FOR UPDATE;
```

### Race Condition Prevention

**Scenario**: Multiple users trying to buy the last tickets simultaneously

1. **User A** requests 5 tickets → Locks row, checks availability (10 remaining)
2. **User B** requests 8 tickets → Waits for lock
3. **User A** completes reservation → Updates sold_quantity, releases lock
4. **User B** gets lock, checks availability (5 remaining) → Fails with insufficient tickets

### Performance Considerations

- **Lock Duration**: Minimal - only during the critical section
- **Deadlock Prevention**: Consistent ordering of operations
- **Scalability**: Suitable for moderate to high concurrency

## Testing Strategy

### Test Coverage

1. **Unit Tests**
   - Basic reservation and release operations
   - Error handling scenarios
   - Validation logic
   - Edge cases

2. **Integration Tests**
   - Database transaction handling
   - Concurrency scenarios
   - QueryRunner integration
   - Data consistency

3. **Performance Tests**
   - High concurrency load testing
   - Lock contention scenarios
   - Database performance impact

### Key Test Scenarios

```javascript
// Concurrent reservations
const promises = Array.from({ length: 100 }, () => 
  ticketTypesService.reserveTickets(ticketId, 1)
);
const results = await Promise.allSettled(promises);

// Should handle exactly total_quantity successful reservations
const successful = results.filter(r => r.status === 'fulfilled');
expect(successful).toHaveLength(totalQuantity);
```

## API Integration

### Example Controller Usage

```javascript
class TicketController {
  async purchaseTickets(req, res) {
    const queryRunner = sequelize.createQueryRunner();
    
    await queryRunner.startTransaction();
    try {
      // Reserve tickets
      const reservation = await ticketTypesService.reserveTickets(
        req.body.ticketTypeId, 
        req.body.quantity, 
        queryRunner
      );
      
      // Create order
      const order = await orderService.createOrder({
        userId: req.user.id,
        ticketTypeId: req.body.ticketTypeId,
        quantity: req.body.quantity,
        totalAmount: reservation.ticketType.price * req.body.quantity,
      }, queryRunner);
      
      // Process payment
      await paymentService.processPayment(order.id, req.body.paymentInfo, queryRunner);
      
      await queryRunner.commitTransaction();
      
      res.json({ success: true, orderId: order.id });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      res.status(400).json({ error: error.message });
    } finally {
      await queryRunner.release();
    }
  }
}
```

## Monitoring and Analytics

### Key Metrics

1. **Inventory Utilization**
   - `remainingQuantity / totalQuantity`
   - Reservation success rate
   - Release frequency

2. **Performance Metrics**
   - Lock wait times
   - Transaction duration
   - Concurrent operation count

3. **Business Metrics**
   - Sales velocity
   - Overselling attempts (should be zero)
   - Inventory turnover

### Logging Strategy

```javascript
// Reservation logging
console.log('TICKET_RESERVATION', {
  ticketTypeId,
  quantity,
  remainingBefore: ticketType.totalQuantity - ticketType.soldQuantity,
  remainingAfter: ticketType.totalQuantity - newSoldQuantity,
  timestamp: new Date(),
  userId: req.user?.id,
});
```

## Best Practices

### For Developers

1. **Always Use Transactions**: For multi-step operations involving tickets
2. **Handle Exceptions Gracefully**: Provide clear error messages to users
3. **Monitor Lock Contention**: Watch for performance bottlenecks
4. **Test Concurrency**: Verify behavior under load

### For Operations

1. **Regular Audits**: Verify inventory counts match database
2. **Performance Monitoring**: Track lock wait times and transaction duration
3. **Capacity Planning**: Ensure database can handle expected load
4. **Backup Strategy**: Regular backups with point-in-time recovery

## Future Enhancements

### Planned Features

1. **Distributed Locking**: For multi-database deployments
2. **Event Sourcing**: Audit trail of all inventory changes
3. **Caching Layer**: Redis-based inventory caching
4. **Real-time Updates**: WebSocket notifications for inventory changes

### Scalability Options

1. **Read Replicas**: For inventory queries
2. **Partitioning**: By event or region
3. **Queue-based Processing**: For high-volume operations
4. **Microservice Decomposition**: Separate inventory service

## Troubleshooting

### Common Issues

1. **Lock Timeouts**
   - **Cause**: Long-running transactions
   - **Solution**: Optimize transaction scope, add indexes

2. **Deadlocks**
   - **Cause**: Inconsistent operation ordering
   - **Solution**: Standardize access patterns

3. **Performance Issues**
   - **Cause**: High contention on popular tickets
   - **Solution**: Implement queuing or batch processing

### Debugging Tools

```javascript
// Enable query logging
sequelize.options.logging = (sql, timing) => {
  if (sql.includes('FOR UPDATE')) {
    console.log('LOCK_QUERY:', { sql, timing });
  }
};
```

This implementation provides a robust, scalable foundation for ticket inventory management with strong guarantees against overselling and comprehensive support for concurrent operations.
