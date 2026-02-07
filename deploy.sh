#!/bin/bash
set -e

# Buddy Infrastructure Deployment Script
# Usage: ./deploy.sh [--environment dev|prod] [--region us-east-1]

ENVIRONMENT="dev"
REGION="us-east-1"
STACK_NAME="buddy-dynamodb"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    --help)
      echo "Usage: ./deploy.sh [--environment dev|prod] [--region us-east-1]"
      echo ""
      echo "Options:"
      echo "  --environment    Deployment environment (default: dev)"
      echo "  --region         AWS region (default: us-east-1)"
      echo "  --help           Show this help message"
      exit 0
      ;;
    *)
      echo "${RED}Unknown option: $1${NC}"
      echo "Run ./deploy.sh --help for usage"
      exit 1
      ;;
  esac
done

echo "🚀 Deploying Buddy infrastructure..."
echo "   Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo "   Region: ${YELLOW}${REGION}${NC}"
echo ""

# Check AWS credentials
echo "🔐 Checking AWS credentials..."
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "${RED}❌ AWS credentials not configured.${NC}"
    echo "   Run: aws configure"
    echo "   Or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "${GREEN}✅ AWS credentials valid${NC}"
echo "   Account: ${ACCOUNT_ID}"
echo ""

# Check if Nova is available in region
echo "🔍 Checking Bedrock Nova availability..."
if ! aws bedrock list-foundation-models --region ${REGION} --query "modelSummaries[?modelId.contains(@, 'nova')].modelId" --output text > /dev/null 2>&1; then
    echo "${YELLOW}⚠️  Cannot verify Nova models. You may need to request access:${NC}"
    echo "   https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess"
fi
echo ""

# Deploy CloudFormation stack
echo "📦 Deploying DynamoDB tables..."
aws cloudformation deploy \
    --template-file infrastructure/dynamodb.yaml \
    --stack-name "${STACK_NAME}-${ENVIRONMENT}" \
    --parameter-overrides Environment="${ENVIRONMENT}" \
    --region "${REGION}" \
    --capabilities CAPABILITY_IAM \
    --no-fail-on-empty-changeset

if [ $? -eq 0 ]; then
    echo "${GREEN}✅ DynamoDB tables deployed${NC}"
else
    echo "${RED}❌ Deployment failed${NC}"
    exit 1
fi
echo ""

# Get table names from CloudFormation outputs
echo "📋 Getting resource information..."
CAREGIVERS_TABLE=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`CaregiversTableName`].OutputValue' \
    --output text \
    --region "${REGION}")

PATIENTS_TABLE=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`PatientsTableName`].OutputValue' \
    --output text \
    --region "${REGION}")

LOGS_TABLE=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`ConversationLogsTableName`].OutputValue' \
    --output text \
    --region "${REGION}")

echo "${GREEN}✅ Resources ready${NC}"
echo ""
echo "📊 DynamoDB Tables:"
echo "   ${YELLOW}Caregivers:${NC}  ${CAREGIVERS_TABLE}"
echo "   ${YELLOW}Patients:${NC}    ${PATIENTS_TABLE}"
echo "   ${YELLOW}Logs:${NC}        ${LOGS_TABLE}"
echo ""

# Create environment file for other scripts
cat > .env << EOF
ENVIRONMENT=${ENVIRONMENT}
REGION=${REGION}
CAREGIVERS_TABLE=${CAREGIVERS_TABLE}
PATIENTS_TABLE=${PATIENTS_TABLE}
LOGS_TABLE=${LOGS_TABLE}
AWS_ACCOUNT_ID=${ACCOUNT_ID}
EOF

echo "💾 Environment saved to .env"
echo ""

# Install dependencies if needed
if ! python3 -c "import boto3" 2>/dev/null; then
    echo "📦 Installing Python dependencies..."
    pip install -q boto3 bcrypt python-dotenv
fi

# Seed data
echo "🌱 Seeding test data..."
python3 infrastructure/seed_data.py

echo ""
echo "${GREEN}✅ Phase 1 Infrastructure Complete!${NC}"
echo ""
echo "📋 Test Credentials:"
echo "   Username: ${YELLOW}caregiver_test${NC}"
echo "   Password: ${YELLOW}Demo2026!${NC}"
echo "   Patient:  ${YELLOW}John Doe (pt-001)${NC}"
echo ""
echo "🔗 Next Steps:"
echo "   1. Deploy Lambda IAM roles: ./deploy-iam.sh"
echo "   2. Deploy Alexa Lambda: ./deploy-lambda.sh"
echo "   3. Test data: python3 infrastructure/seed_data.py --verify"
echo ""
