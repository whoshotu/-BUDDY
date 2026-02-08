# Buddy - DynamoDB Optimization Guide

Based on AWS Well-Architected Serverless Applications Lens

## Overview

This guide documents DynamoDB optimization strategies implemented in Buddy to ensure high performance, low latency, and cost efficiency.

## Current Optimizations Implemented

### 1. On-Demand Capacity Mode

**Status:** ✅ Implemented  
**Location:** `infrastructure/dynamodb.yaml`

```yaml
BillingMode: PAY_PER_REQUEST
```

**Benefits:**
- No capacity planning required
- Pay only for what you use
- Automatic scaling
- Perfect for variable traffic (healthcare use case)

**When to Change:**
- Switch to provisioned if you have predictable traffic > 1000 requests/day
- Use auto-scaling with provisioned mode for cost savings

### 2. Projection Expressions

**Status:** ✅ Implemented  
**Location:** `src/alexa-skill/index.js`

```javascript
// Only fetch needed fields
const patientResult = await docClient.send(new GetCommand({
  TableName: TABLES.PATIENTS,
  Key: { patientId },
  ProjectionExpression: 'patientId, preferredName, dementiaStage, people, routines, medications, safetyProfile'
}));
```

**Benefits:**
- Reduces data transfer
- Faster response times
- Lower costs
- Less memory usage in Lambda

### 3. GSI Optimization

**Status:** ✅ Implemented  
**Location:** `infrastructure/dynamodb.yaml`

**BuddyAssignments Table:**
```yaml
GlobalSecondaryIndexes:
  - IndexName: patientIdIndex  # Find caregivers for patient
    KeySchema:
      - AttributeName: patientId
        KeyType: HASH
      - AttributeName: assignedAt
        KeyType: RANGE
  
  - IndexName: assignedAtIndex  # Recent assignments
    KeySchema:
      - AttributeName: caregiverId
        KeyType: HASH
      - AttributeName: assignedAt
        KeyType: RANGE
```

**Query Patterns Optimized:**
1. List patients by caregiver: Query by `caregiverId`
2. Find caregivers for patient: Query `patientIdIndex`
3. Recent assignments: Query `assignedAtIndex`

### 4. TTL for Conversation Logs

**Status:** ✅ Implemented  
**Location:** `infrastructure/dynamodb.yaml`

```yaml
TimeToLiveSpecification:
  AttributeName: expiresAt
  Enabled: true
```

**Benefits:**
- Automatic deletion after 90 days
- Privacy compliance (HIPAA consideration)
- Reduced storage costs
- No manual cleanup required

### 5. Connection Reuse (SDK v3)

**Status:** ✅ Automatic with AWS SDK v3  
**Location:** `src/alexa-skill/index.js`

AWS SDK v3 automatically handles connection pooling and reuse. No code changes needed.

### 6. Parallel Queries

**Status:** ⚠️ Can be improved  
**Current:** Sequential queries in `getPatientContext()`

**Future Optimization:**
```javascript
// Query caregiver and patient in parallel
const [caregiverResult, patientResult] = await Promise.all([
  docClient.send(caregiverQuery),
  docClient.send(patientQuery)
]);
```

## Performance Metrics to Monitor

### Key Metrics (CloudWatch)

1. **ConsumedReadCapacityUnits**
   - Target: < 80% of provisioned (if using provisioned)
   - Alert if: Sustained throttling

2. **ConsumedWriteCapacityUnits**
   - Target: < 80% of provisioned
   - Alert if: Write throttling during peak

3. **ThrottledRequests**
   - Target: 0
   - Alert if: > 0 (immediate)

4. **UserErrors**
   - Target: 0
   - Alert if: > 0 (indicates bad queries)

5. **SystemErrors**
   - Target: 0
   - Alert if: > 0 (AWS service issue)

### Custom Metrics (Already Implemented)

```javascript
// In CloudWatch dashboard
Buddy/DynamoDB:ReadLatency
Buddy/DynamoDB:WriteLatency
```

## Query Optimization Checklist

### Read Operations

- [ ] Use `GetItem` when you have full primary key
- [ ] Use `Query` when filtering on sort key
- [ ] Avoid `Scan` operations in production
- [ ] Use `ProjectionExpression` to limit returned attributes
- [ ] Use `Limit` parameter when you only need N items
- [ ] Implement pagination for large result sets

### Write Operations

- [ ] Use `PutItem` for single items
- [ ] Use `BatchWriteItem` for multiple items
- [ ] Use `UpdateItem` with `UpdateExpression` for partial updates
- [ ] Use `ConditionExpression` for optimistic locking
- [ ] Avoid overwriting entire items

### Index Usage

- [ ] Query GSI instead of scanning when possible
- [ ] Ensure GSI keys match query patterns
- [ ] Monitor GSI storage costs (duplicates data)
- [ ] Use sparse indexes (project only needed attributes)

## Future Optimizations

### 1. DynamoDB Accelerator (DAX)

**Use Case:** If read-heavy and latency-critical

**Implementation:**
```javascript
const { DaxClient } = require('@aws-sdk/lib-dax');

const daxClient = new DaxClient({
  endpoints: ['dax-cluster.buddy.cache.amazonaws.com:8111'],
  region: 'us-east-1'
});
```

**Benefits:**
- Microsecond latency (vs millisecond)
- Caches frequently accessed data
- Reduces DynamoDB read capacity

**Trade-offs:**
- Additional cost (~$0.20/hour for small cluster)
- Eventual consistency
- More infrastructure to manage

### 2. In-Memory Caching

**Use Case:** Cache patient profiles (rarely change)

**Implementation Options:**

**Option A: Lambda Instance Cache (Simple)**
```javascript
// Simple in-memory cache
const patientCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getPatientWithCache(patientId) {
  const cached = patientCache.get(patientId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const patient = await getPatientFromDynamoDB(patientId);
  patientCache.set(patientId, {
    data: patient,
    timestamp: Date.now()
  });
  
  return patient;
}
```

**Option B: ElastiCache Redis (Scalable)**
```javascript
const Redis = require('ioredis');
const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: 6379
});

async function getPatientWithCache(patientId) {
  const cached = await redis.get(`patient:${patientId}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const patient = await getPatientFromDynamoDB(patientId);
  await redis.setex(`patient:${patientId}`, 300, JSON.stringify(patient));
  
  return patient;
}
```

**Cache Invalidation Strategy:**
- Patient updates: Invalidate immediately
- TTL: 5 minutes for profiles, 1 hour for routines/medications

### 3. DynamoDB Streams + Lambda

**Use Case:** Real-time processing of conversation logs

**Implementation:**
```yaml
# CloudFormation
BuddyConversationStream:
  Type: AWS::Lambda::EventSourceMapping
  Properties:
    EventSourceArn: !GetAtt BuddyConversationLogsTable.StreamArn
    FunctionName: !GetAtt AnalyticsLambdaFunction.Arn
    StartingPosition: LATEST
    FilterCriteria:
      Filters:
        - Pattern: '{"data":{"escalationLevel":{"N":[{"numeric":[">",0]}]}}}'
```

**Benefits:**
- Real-time analytics
- Automated alerts
- Data pipeline to S3/Redshift

### 4. Global Tables (Multi-Region)

**Use Case:** Low-latency access for geographically distributed users

**Trade-offs:**
- Higher cost (replicates data)
- Eventual consistency across regions
- Overkill for hackathon/MVP

## Cost Optimization

### Current Monthly Cost Estimate (Dev Environment)

**DynamoDB On-Demand:**
- Storage: ~$0.25/month (1-5GB)
- Read/Write: ~$1-5/month (variable)
- **Total**: ~$2-6/month

**Optimization Strategies:**

1. **Use TTL Aggressively**
   - Conversation logs: 90 days
   - Consider shorter for dev/test

2. **Batch Operations**
   ```javascript
   // Instead of multiple PutItem
   const batchWrite = {
     RequestItems: {
       [TABLES.LOGS]: [
         { PutRequest: { Item: log1 } },
         { PutRequest: { Item: log2 } },
         { PutRequest: { Item: log3 } }
       ]
     }
   };
   await docClient.send(new BatchWriteCommand(batchWrite));
   ```

3. **Compress Large Items**
   ```javascript
   const zlib = require('zlib');
   const compressed = zlib.deflateSync(JSON.stringify(largeData)).toString('base64');
   ```

4. **DynamoDB Reserved Capacity (Production)**
   - 1-year commitment: ~40% savings
   - 3-year commitment: ~60% savings

## Monitoring and Alerting

### CloudWatch Alarms

```yaml
# Add to monitoring.yaml
DynamoDBThrottlingAlarm:
  Type: AWS::CloudWatch::Alarm
  Properties:
    AlarmName: !Sub "buddy-dynamodb-throttling-${Environment}"
    MetricName: ThrottledRequests
    Namespace: AWS/DynamoDB
    Statistic: Sum
    Period: 60
    EvaluationPeriods: 1
    Threshold: 0
    ComparisonOperator: GreaterThanThreshold
```

### X-Ray Subsegments

Already implemented for:
- `getPatientContext`: Tracks patient lookup time
- `generateNovaResponse`: Tracks Nova API latency

Add more subsegments for:
```javascript
// Log conversation
const logSubsegment = segment.addNewSubsegment('logConversation');
// ... logging code ...
logSubsegment.close();

// Check repetition
const repetitionSubsegment = segment.addNewSubsegment('checkRepetition');
// ... repetition check ...
repetitionSubsegment.close();
```

## Best Practices Summary

1. ✅ Use on-demand for variable workloads
2. ✅ Use projection expressions
3. ✅ Use appropriate indexes
4. ✅ Enable TTL for data lifecycle
5. ✅ Monitor throttling and errors
6. ⚠️ Consider caching for production
7. ⚠️ Implement batch operations for bulk writes
8. ⚠️ Add DAX if read-heavy (future)

## References

- [AWS Well-Architected Serverless Lens](https://docs.aws.amazon.com/wellarchitected/latest/serverless-applications-lens/data-layer.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [DynamoDB Performance](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/performance.html)
- [DynamoDB Cost Optimization](https://aws.amazon.com/blogs/database/tag/cost-optimization/)

## License

MIT License - Amazon Nova Hackathon 2026
