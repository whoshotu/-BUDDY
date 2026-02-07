#!/bin/bash

# Quick verification script for Buddy infrastructure
# Checks that all resources are deployed and accessible

ENVIRONMENT="dev"
REGION="us-east-1"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Verifying Buddy Infrastructure..."
echo ""

# Load environment if exists
if [ -f .env ]; then
    export $(cat .env | xargs)
    echo "📋 Loaded configuration from .env"
    echo "   Environment: ${ENVIRONMENT}"
    echo "   Region: ${REGION}"
    echo ""
else
    echo "${YELLOW}⚠️  .env file not found. Using defaults.${NC}"
    echo "   Run ./deploy.sh first to create configuration."
    echo ""
fi

ERRORS=0

# Check AWS credentials
echo "🔐 Checking AWS credentials..."
if aws sts get-caller-identity > /dev/null 2>&1; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    echo "${GREEN}✅${NC} AWS credentials valid (Account: ${ACCOUNT_ID})"
else
    echo "${RED}❌${NC} AWS credentials not configured"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check DynamoDB tables
echo "📊 Checking DynamoDB tables..."
for TABLE in "BuddyCaregivers-${ENVIRONMENT}" "BuddyPatients-${ENVIRONMENT}" "BuddyConversationLogs-${ENVIRONMENT}"; do
    if aws dynamodb describe-table --table-name "${TABLE}" --region "${REGION}" > /dev/null 2>&1; then
        echo "${GREEN}✅${NC} ${TABLE}"
    else
        echo "${RED}❌${NC} ${TABLE} (not found)"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Check seed data
echo "🌱 Checking seed data..."
python3 infrastructure/seed_data.py --verify 2>/dev/null || {
    echo "${YELLOW}⚠️${NC}  Could not verify seed data"
}
echo ""

# Check IAM Role
if [ ! -z "$ROLE_ARN" ]; then
    echo "🔐 Checking IAM role..."
    ROLE_NAME=$(echo "$ROLE_ARN" | rev | cut -d'/' -f1 | rev)
    if aws iam get-role --role-name "${ROLE_NAME}" > /dev/null 2>&1; then
        echo "${GREEN}✅${NC} IAM Role: ${ROLE_NAME}"
    else
        echo "${RED}❌${NC} IAM Role not found"
        ERRORS=$((ERRORS + 1))
    fi
    echo ""
fi

# Check SNS Topic
if [ ! -z "$SNS_TOPIC_ARN" ]; then
    echo "📢 Checking SNS topic..."
    if aws sns get-topic-attributes --topic-arn "$SNS_TOPIC_ARN" > /dev/null 2>&1; then
        echo "${GREEN}✅${NC} SNS Topic: ${SNS_TOPIC_ARN}"
    else
        echo "${RED}❌${NC} SNS Topic not found"
        ERRORS=$((ERRORS + 1))
    fi
    echo ""
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ]; then
    echo "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "🔗 Next steps:"
    echo "   1. Deploy IAM roles:  ./deploy-iam.sh"
    echo "   2. Deploy Lambda:     ./deploy-lambda.sh"
    echo "   3. Configure Alexa skill in Developer Console"
else
    echo "${RED}❌ ${ERRORS} check(s) failed${NC}"
    echo ""
    echo "🔧 Run these commands to fix:"
    echo "   ./deploy.sh              # Deploy infrastructure"
    echo "   ./deploy-iam.sh          # Deploy IAM roles"
fi
