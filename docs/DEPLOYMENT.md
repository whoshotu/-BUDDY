# Buddy - Deployment Strategies Guide

Based on AWS Well-Architected Serverless Applications Lens

## Overview

This guide covers deployment strategies for Buddy to ensure safe, reliable updates to production. Following these practices minimizes risk and enables quick rollback if issues are detected.

## Deployment Strategies

### 1. All-at-Once Deployment (Current)

**Use Case:** Development and testing environments

**How it works:**
- Deploys new version to 100% of traffic immediately
- Simple and fast
- Complete replacement of old version

**Pros:**
- Fast deployment
- Simple to understand
- No infrastructure complexity

**Cons:**
- High blast radius if issues occur
- No gradual rollout
- All users affected simultaneously

**Command:**
```bash
./deploy-lambda.sh --environment dev --region us-east-1
```

**When to use:**
- Development environments
- Low-risk updates (documentation, logging)
- Urgent hotfixes with high confidence
- Initial deployments

---

### 2. Blue/Green Deployment

**Use Case:** Production environments requiring zero downtime

**How it works:**
- Deploy new version alongside old version (Green environment)
- Test Green environment thoroughly
- Switch traffic from Blue (old) to Green (new) instantly
- Keep Blue environment for quick rollback

**Pros:**
- Zero downtime
- Instant rollback capability
- Full testing before traffic switch
- Simple mental model

**Cons:**
- Double infrastructure cost during deployment
- Complex to implement with Lambda aliases
- Session state considerations

**Implementation:**

```bash
#!/bin/bash
# deploy-bluegreen.sh

ENVIRONMENT="prod"
FUNCTION_NAME="buddy-alexa-skill"
ALIAS_NAME="live"

# Get current version (Blue)
BLUE_VERSION=$(aws lambda get-alias \
    --function-name "${FUNCTION_NAME}-${ENVIRONMENT}" \
    --name "${ALIAS_NAME}" \
    --query 'FunctionVersion' \
    --output text)

echo "Current Blue version: ${BLUE_VERSION}"

# Deploy new version (Green)
./deploy-lambda.sh --environment "${ENVIRONMENT}"

# Get new version number
GREEN_VERSION=$(aws lambda publish-version \
    --function-name "${FUNCTION_NAME}-${ENVIRONMENT}" \
    --query 'Version' \
    --output text)

echo "New Green version: ${GREEN_VERSION}"

# Run smoke tests on Green
echo "Running smoke tests..."
# Add your smoke test commands here

# Switch traffic to Green
aws lambda update-alias \
    --function-name "${FUNCTION_NAME}-${ENVIRONMENT}" \
    --name "${ALIAS_NAME}" \
    --function-version "${GREEN_VERSION}"

echo "Traffic switched to Green (v${GREEN_VERSION})"

# Monitor for 10 minutes
sleep 600

# If issues detected, rollback to Blue
# aws lambda update-alias \
#     --function-name "${FUNCTION_NAME}-${ENVIRONMENT}" \
#     --name "${ALIAS_NAME}" \
#     --function-version "${BLUE_VERSION}"
```

**When to use:**
- Major feature releases
- Database schema changes
- High-risk updates
- Production environments with strict uptime requirements

---

### 3. Canary Deployment

**Use Case:** Gradual rollout with automatic rollback

**How it works:**
- Deploy new version alongside old version
- Route small percentage of traffic to new version (e.g., 10%)
- Monitor metrics (errors, latency, business metrics)
- Gradually increase traffic (10% → 50% → 100%)
- Automatic rollback if error threshold exceeded

**Pros:**
- Minimal blast radius
- Real user testing
- Automatic rollback on failure
- Gradual confidence building

**Cons:**
- More complex setup
- Longer deployment time
- Requires CloudWatch alarms
- Potential data consistency issues during transition

**Implementation:**

```bash
#!/bin/bash
# deploy-canary.sh

ENVIRONMENT="prod"
FUNCTION_NAME="buddy-alexa-skill"
ALIAS_NAME="live"
CANARY_PERCENTAGES=(10 25 50 100)
MONITOR_DURATION=300  # 5 minutes between stages
ERROR_THRESHOLD=1     # 1% error rate threshold

# Deploy new version
./deploy-lambda.sh --environment "${ENVIRONMENT}"

NEW_VERSION=$(aws lambda publish-version \
    --function-name "${FUNCTION_NAME}-${ENVIRONMENT}" \
    --query 'Version' \
    --output text)

echo "Deployed version: ${NEW_VERSION}"

# Progressive rollout
for PERCENTAGE in "${CANARY_PERCENTAGES[@]}"; do
    echo "Rolling out to ${PERCENTAGE}% traffic..."
    
    # Update alias with routing config
    aws lambda update-alias \
        --function-name "${FUNCTION_NAME}-${ENVIRONMENT}" \
        --name "${ALIAS_NAME}" \
        --function-version "${NEW_VERSION}" \
        --routing-config "AdditionalVersionWeights={\"${NEW_VERSION}\":${PERCENTAGE}}"
    
    # Monitor
    echo "Monitoring for ${MONITOR_DURATION} seconds..."
    sleep ${MONITOR_DURATION}
    
    # Check error rate
    ERROR_RATE=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Lambda \
        --metric-name Errors \
        --dimensions Name=FunctionName,Value="${FUNCTION_NAME}-${ENVIRONMENT}" \
        --start-time $(date -u -v-5M +%Y-%m-%dT%H:%M:%S) \
        --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
        --period 300 \
        --statistics Sum \
        --query 'Datapoints[0].Sum' \
        --output text)
    
    if (( $(echo "$ERROR_RATE > $ERROR_THRESHOLD" | bc -l) )); then
        echo "ERROR: Error rate ${ERROR_RATE}% exceeds threshold. Rolling back..."
        
        # Rollback to previous version
        aws lambda update-alias \
            --function-name "${FUNCTION_NAME}-${ENVIRONMENT}" \
            --name "${ALIAS_NAME}" \
            --function-version "${PREVIOUS_VERSION}"
        
        exit 1
    fi
    
    echo "✅ Stage ${PERCENTAGE}% complete - Error rate acceptable"
done

echo "✅ Canary deployment complete - 100% traffic on new version"
```

**When to use:**
- Production deployments
- A/B testing new features
- Risk mitigation for complex changes
- Gradual feature rollouts

---

## Deployment Checklist

Before any deployment:

- [ ] Tests pass locally
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Rollback plan documented
- [ ] Monitoring dashboards ready
- [ ] On-call engineer notified
- [ ] Deployment window approved

After deployment:

- [ ] Smoke tests pass
- [ ] Error rates normal
- [ ] Latency within SLA
- [ ] Business metrics healthy
- [ ] Rollback window closed (after 24h for canary)

---

## Environment Strategy

```
Development (dev)
├── Strategy: All-at-once
├── Frequency: Continuous
├── Testing: Unit + Integration
└── Approval: None (automated)

Staging (staging)
├── Strategy: All-at-once
├── Frequency: Daily
├── Testing: E2E + Performance
└── Approval: Tech Lead

Production (prod)
├── Strategy: Canary (10% → 50% → 100%)
├── Frequency: Weekly or On-demand
├── Testing: Smoke + Canary monitoring
└── Approval: Team + Business
```

---

## Lambda Versioning Strategy

### Versioning Scheme

```
$Latest  → Always points to latest code (development)
$LIVE    → Production alias (canary routing)
$STAGING → Staging alias
```

### Code Versions

- **Version numbers**: Auto-incremented by AWS (1, 2, 3, ...)
- **Immutable**: Once published, cannot change
- **Retention**: Keep last 10 versions, delete older ones

### Cleanup Script

```bash
#!/bin/bash
# cleanup-old-versions.sh

FUNCTION_NAME="buddy-alexa-skill-prod"
KEEP_VERSIONS=10

# Get all versions except $LATEST
VERSIONS=$(aws lambda list-versions-by-function \
    --function-name "${FUNCTION_NAME}" \
    --query 'Versions[?Version!=`$LATEST`].Version' \
    --output text)

# Sort and get versions to delete
SORTED_VERSIONS=($(echo ${VERSIONS} | tr ' ' '\n' | sort -n))
TOTAL_VERSIONS=${#SORTED_VERSIONS[@]}

if [ $TOTAL_VERSIONS -gt $KEEP_VERSIONS ]; then
    DELETE_COUNT=$((TOTAL_VERSIONS - KEEP_VERSIONS))
    echo "Deleting ${DELETE_COUNT} old versions..."
    
    for ((i=0; i<DELETE_COUNT; i++)); do
        VERSION=${SORTED_VERSIONS[$i]}
        echo "Deleting version ${VERSION}..."
        aws lambda delete-function \
            --function-name "${FUNCTION_NAME}" \
            --qualifier "${VERSION}"
    done
fi
```

---

## Monitoring During Deployment

### Key Metrics to Watch

1. **Error Rate**
   - Threshold: < 1%
   - Alert: Immediate
   - Action: Rollback

2. **Latency (P99)**
   - Threshold: < 6 seconds (Alexa limit is 8s)
   - Alert: Immediate
   - Action: Investigate

3. **Throttles**
   - Threshold: 0
   - Alert: Immediate
   - Action: Increase concurrency limit

4. **Cold Start Duration**
   - Threshold: < 2 seconds
   - Alert: Warning
   - Action: Optimize package size

### CloudWatch Alarms

Create alarms for:
- Lambda error rate > 1%
- Lambda duration > 6 seconds
- DynamoDB throttled requests > 0
- Custom: Safety escalations > 1/hour

---

## Rollback Procedures

### Scenario 1: Immediate Rollback (Critical Issue)

```bash
# Rollback to previous version immediately
aws lambda update-alias \
    --function-name buddy-alexa-skill-prod \
    --name live \
    --function-version PREVIOUS_VERSION_NUMBER

# Verify rollback
aws lambda get-alias \
    --function-name buddy-alexa-skill-prod \
    --name live
```

### Scenario 2: Gradual Rollback (Canary)

```bash
# Reduce canary traffic to 0%
aws lambda update-alias \
    --function-name buddy-alexa-skill-prod \
    --name live \
    --function-version STABLE_VERSION \
    --routing-config "AdditionalVersionWeights={}"
```

### Scenario 3: Database Compatibility Issue

1. Stop deployment immediately
2. Rollback Lambda version
3. Verify database schema compatibility
4. If needed, run database migration rollback
5. Notify stakeholders
6. Schedule incident review

---

## Best Practices

### 1. Deployment Automation

- Use CI/CD pipelines (GitHub Actions, CodePipeline)
- Never deploy manually to production
- Automate testing and validation

### 2. Small, Frequent Changes

- Deploy small changes frequently
- Reduces risk per deployment
- Easier to identify issues

### 3. Feature Flags

```javascript
// Use feature flags for gradual feature rollout
const FEATURES = {
  newMedicationFlow: process.env.ENABLE_NEW_MEDICATION_FLOW === 'true',
  enhancedSafety: process.env.ENABLE_ENHANCED_SAFETY === 'true'
};

if (FEATURES.newMedicationFlow) {
  // New implementation
} else {
  // Legacy implementation
}
```

### 4. Database Migrations

- Separate schema changes from code changes
- Make schema changes backward compatible
- Use expansion/contraction pattern

### 5. Communication

- Notify team before production deployments
- Post in #deployments Slack channel
- Update status page if user-facing

---

## Emergency Procedures

### Deployment Failure

1. **Immediate**: Stop deployment
2. **Assess**: Check error logs
3. **Decide**: Rollback or fix forward
4. **Execute**: Rollback if < 30 minutes since deploy
5. **Communicate**: Notify team
6. **Review**: Post-mortem within 24 hours

### Data Corruption

1. **Stop**: Halt all deployments
2. **Isolate**: Prevent further damage
3. **Assess**: Determine scope
4. **Restore**: From backups if needed
5. **Verify**: Test restored data
6. **Communicate**: Notify stakeholders
7. **Review**: Root cause analysis

---

## Resources

- [AWS Well-Architected Serverless Lens](https://docs.aws.amazon.com/wellarchitected/latest/serverless-applications-lens/welcome.html)
- [Lambda Deployment Strategies](https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html)
- [Canary Deployments with Lambda](https://aws.amazon.com/blogs/compute/implementing-canary-deployments-of-aws-lambda-functions-with-alias-traffic-shifting/)

---

## License

MIT License - Amazon Nova Hackathon 2026
