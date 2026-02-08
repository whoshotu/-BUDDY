# Buddy - Setup Guide

Complete guide for setting up and deploying Buddy from scratch.

## Prerequisites

### Required Accounts & Access

1. **AWS Account**
   - Account ID: `052080186586`
   - Region: `us-east-1`
   - IAM user with appropriate permissions

2. **AWS Services Access**
   - Amazon Bedrock (Nova models)
   - AWS Lambda
   - Amazon DynamoDB
   - Amazon SNS
   - AWS CloudFormation
   - Amazon CloudWatch

3. **Development Tools**
   - AWS CLI v2+ installed
   - Node.js 18+ 
   - Python 3.9+
   - Git

## Installation Steps

### Step 1: Install AWS CLI

```bash
# Download and install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
mkdir -p ~/.local/bin
./aws/install --install-dir ~/.local/aws-cli --bin-dir ~/.local/bin --update

# Add to PATH
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# Verify installation
aws --version
```

### Step 2: Configure AWS Credentials

```bash
aws configure

# Enter your credentials:
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: xxx...
# Default region name: us-east-1
# Default output format: json

# Verify configuration
aws sts get-caller-identity
```

### Step 3: Clone Repository

```bash
git clone <repository-url>
cd buddy
```

### Step 4: Install Dependencies

**Node.js (for Lambda):**
```bash
cd src/alexa-skill
npm install
cd ../..
```

**Python (for infrastructure):**
```bash
pip3 install boto3 --user --break-system-packages
```

**Dashboard (optional):**
```bash
cd src/caregiver-dashboard
npm install
cd ../..
```

### Step 5: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

**Required variables:**
```bash
AWS_REGION=us-east-1
ENVIRONMENT=dev
```

Other variables will be auto-populated during deployment.

## Deployment

### Phase 1: Infrastructure (DynamoDB)

```bash
cd scripts
./deploy.sh --environment dev --region us-east-1
```

**This creates:**
- 4 DynamoDB tables
- Test data seeded
- Takes ~2 minutes

**Verify:**
```bash
aws dynamodb list-tables | grep Buddy
```

### Phase 2: IAM Roles & SNS

```bash
./deploy-iam.sh --environment dev --region us-east-1
```

**This creates:**
- IAM role for Lambda
- SNS topic for SMS alerts
- All required permissions

**Verify:**
```bash
aws iam get-role --role-name buddy-lambda-role-dev
aws sns list-topics | grep buddy
```

### Phase 3: Lambda Function

```bash
./deploy-lambda.sh --environment dev --region us-east-1
```

**This creates:**
- Lambda function with Alexa trigger
- Environment variables configured
- X-Ray tracing enabled

**Verify:**
```bash
aws lambda get-function --function-name buddy-alexa-skill-dev
```

### Phase 4: Test Deployment

```bash
# Run test suite
cd ../test
./test-lambda.sh
```

**Expected output:**
- Emergency test: ✅ PASS
- Routine test: ✅ PASS  
- SMS alert sent

### Phase 5: Dashboard (Optional)

```bash
cd ../src/caregiver-dashboard
npm run dev
```

**Access:** http://localhost:3000

## Verification

### Complete System Check

```bash
cd scripts
./verify.sh
```

### Manual Checks

**Infrastructure:**
```bash
# Check DynamoDB tables
aws dynamodb list-tables --query 'TableNames[?contains(@, `Buddy`)]'

# Check Lambda
aws lambda get-function --function-name buddy-alexa-skill-dev --query 'Configuration.State'

# Check IAM role
aws iam get-role --role-name buddy-lambda-role-dev

# Check SNS topic
aws sns list-topics --query 'Topics[*].TopicArn' | grep buddy
```

**Test Data:**
```bash
# Verify patient exists
aws dynamodb get-item \
    --table-name BuddyPatients-dev \
    --key '{"patientId":{"S":"pt-001"}}' \
    --query 'Item.preferredName.S'

# Verify caregiver exists
aws dynamodb scan \
    --table-name BuddyCaregivers-dev \
    --query 'Items[0].username.S'
```

## Troubleshooting

### Common Issues

**1. AWS CLI not found**
```bash
# Add to PATH
export PATH="$HOME/.local/bin:$PATH"

# Or reinstall
./aws/install --install-dir ~/.local/aws-cli --bin-dir ~/.local/bin --update
```

**2. Permission denied on scripts**
```bash
chmod +x scripts/*.sh
chmod +x test/*.sh
```

**3. DynamoDB table not found**
```bash
# Check CloudFormation stack
aws cloudformation describe-stacks --stack-name buddy-dynamodb-dev

# Re-deploy if needed
cd scripts
./deploy.sh --environment dev --region us-east-1
```

**4. Lambda deployment fails**
```bash
# Check if role exists
aws iam get-role --role-name buddy-lambda-role-dev

# Check environment variables
cat .env

# Re-deploy IAM first if needed
./deploy-iam.sh --environment dev --region us-east-1
```

**5. SMS not sending**
```bash
# Check SNS permissions
aws iam get-role-policy \
    --role-name buddy-lambda-role-dev \
    --policy-name buddy-lambda-policy

# Verify SNS topic ARN in Lambda env vars
aws lambda get-function \
    --function-name buddy-alexa-skill-dev \
    --query 'Configuration.Environment.Variables.SNS_TOPIC_ARN'
```

## Development Environment

### Local Testing

**Test Lambda without deploying:**
```bash
cd test
./test-lambda.sh
```

**Test specific scenario:**
```bash
# Create test event
cat > /tmp/test-event.json << 'EOF'
{
  "version": "1.0",
  "session": {
    "new": true,
    "sessionId": "test-001",
    "application": {"applicationId": "test"},
    "user": {"userId": "amzn1.ask.account.test"}
  },
  "context": {
    "System": {"user": {"userId": "amzn1.ask.account.test"}}
  },
  "request": {
    "type": "IntentRequest",
    "intent": {
      "name": "EmergencyIntent",
      "slots": {"query": {"name": "query", "value": "I fell down"}}
    }
  }
}
EOF

# Invoke Lambda
aws lambda invoke \
    --function-name buddy-alexa-skill-dev \
    --payload file:///tmp/test-event.json \
    --cli-binary-format raw-in-base64-out \
    /tmp/response.json

# View response
cat /tmp/response.json | python3 -m json.tool
```

### Dashboard Development

```bash
cd src/caregiver-dashboard

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Production Deployment

### Environment Strategy

```
Development (dev)
├── Auto-deploy on push
├── Test data
└── All-at-once deployment

Staging (staging)
├── Manual approval
├── Production-like data
└── Blue/green deployment

Production (prod)
├── Strict approval process
├── Real patient data
└── Canary deployment
```

### Production Checklist

- [ ] Enable CloudWatch detailed monitoring
- [ ] Set up alarms for all critical metrics
- [ ] Configure log retention (90 days)
- [ ] Enable X-Ray sampling
- [ ] Set up backup for DynamoDB
- [ ] Configure SNS spending limits
- [ ] Enable AWS Shield for DDoS protection
- [ ] Set up CloudTrail for audit logging

### Production Deployment Commands

```bash
# Deploy to staging first
./deploy.sh --environment staging --region us-east-1
./deploy-iam.sh --environment staging --region us-east-1
./deploy-lambda.sh --environment staging --region us-east-1

# Run smoke tests
cd ../test
ENVIRONMENT=staging ./test-lambda.sh

# Deploy to production (canary)
./deploy-lambda.sh --environment prod --region us-east-1
```

## Cleanup

### Remove All Resources

**⚠️ WARNING: This deletes everything!**

```bash
# Delete Lambda
aws lambda delete-function --function-name buddy-alexa-skill-dev

# Delete CloudFormation stacks
aws cloudformation delete-stack --stack-name buddy-dynamodb-dev
aws cloudformation delete-stack --stack-name buddy-nova-sonic-websocket-dev

# Delete IAM role (detach policies first)
aws iam delete-role-policy --role-name buddy-lambda-role-dev --policy-name buddy-lambda-policy
aws iam delete-role --role-name buddy-lambda-role-dev

# Delete SNS topic
aws sns delete-topic --topic-arn arn:aws:sns:us-east-1:052080186586:buddy-alerts-dev
```

### Remove Test Data Only

```bash
# Keep tables, remove data
python3 infrastructure/seed_data.py --cleanup
```

## Next Steps

After successful setup:

1. **Test Emergency Flow**: Run `./test/test-lambda.sh`
2. **Explore Dashboard**: Start with `npm run dev`
3. **Read Documentation**: Check `/docs` folder
4. **Customize**: Modify patient data in seed_data.py
5. **Deploy Updates**: Use scripts for iterative deployment

## Support

- **Documentation:** `/docs` folder
- **Issues:** GitHub Issues
- **Email:** lopezanth661@gmail.com

---

**Estimated Setup Time:** 15-20 minutes  
**Last Updated:** February 8, 2026
