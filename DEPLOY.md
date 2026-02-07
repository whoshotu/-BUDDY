# Buddy - Phase 1 Deployment Guide

## Prerequisites

Before deploying, ensure you have:

- [ ] AWS CLI installed: `aws --version`
- [ ] AWS credentials configured: `aws configure`
- [ ] Python 3.9+: `python3 --version`
- [ ] Access to Nova models in AWS Bedrock

## Quick Deploy

Run these commands in order:

```bash
# 1. Deploy DynamoDB tables and seed data
./deploy.sh

# 2. Verify deployment
./verify.sh

# 3. Deploy IAM roles for Lambda
./deploy-iam.sh

# 4. Verify everything is ready
./verify.sh
```

## Step-by-Step

### Step 1: Infrastructure (DynamoDB)

```bash
./deploy.sh --environment dev --region us-east-1
```

This creates:
- `BuddyCaregivers-dev` - Login credentials
- `BuddyPatients-dev` - Patient profiles
- `BuddyConversationLogs-dev` - Conversation history (90-day TTL)

**Test Credentials:**
- Username: `caregiver_test`
- Password: `Demo2026!`

### Step 2: IAM Roles

```bash
./deploy-iam.sh
```

Creates:
- Lambda execution role with DynamoDB, Bedrock, and SNS permissions
- SNS topic for caregiver alerts

### Step 3: Verification

```bash
./verify.sh
```

Checks all resources are deployed and accessible.

## Troubleshooting

### AWS Credentials Not Found

```bash
aws configure
# Enter your Access Key ID and Secret Access Key
```

### Nova Model Access Required

Request access in AWS Console:
https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess

### Permission Denied on Scripts

```bash
chmod +x *.sh
```

## Environment Variables

After running `./deploy.sh`, a `.env` file is created with:

```bash
ENVIRONMENT=dev
REGION=us-east-1
CAREGIVERS_TABLE=BuddyCaregivers-dev
PATIENTS_TABLE=BuddyPatients-dev
LOGS_TABLE=BuddyConversationLogs-dev
AWS_ACCOUNT_ID=0520-8018-6586
```

## Cleanup

To delete all resources:

```bash
# Delete CloudFormation stacks
aws cloudformation delete-stack --stack-name buddy-dynamodb-dev
aws cloudformation delete-stack --stack-name buddy-iam-dev

# Delete SNS topic (if not in CloudFormation)
aws sns delete-topic --topic-arn $(grep SNS_TOPIC_ARN .env | cut -d= -f2)
```
