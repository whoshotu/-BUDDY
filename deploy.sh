#!/bin/bash
set -e

# Buddy Infrastructure Deployment Script
# Usage: ./deploy.sh [--environment dev|prod] [--region us-east-1]

ENVIRONMENT="dev"
REGION="us-east-1"
STACK_NAME="buddy-dynamodb"

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
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

echo "🚀 Deploying Buddy infrastructure..."
echo "   Environment: $ENVIRONMENT"
echo "   Region: $REGION"
echo ""

# Check AWS credentials
echo "Checking AWS credentials..."
aws sts get-caller-identity > /dev/null 2>&1 || {
    echo "❌ AWS credentials not configured. Run: aws configure"
    exit 1
}
echo "✅ AWS credentials valid"
echo ""

# Deploy CloudFormation stack
echo "Deploying DynamoDB tables..."
aws cloudformation deploy \
    --template-file infrastructure/dynamodb.yaml \
    --stack-name "${STACK_NAME}-${ENVIRONMENT}" \
    --parameter-overrides Environment="${ENVIRONMENT}" \
    --region "${REGION}" \
    --capabilities CAPABILITY_IAM \
    --no-fail-on-empty-changeset

echo "✅ DynamoDB tables deployed"
echo ""

# Get table names from CloudFormation outputs
echo "Getting table ARNs..."
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

echo ""
echo "📊 DynamoDB Tables:"
echo "   Caregivers: $CAREGIVERS_TABLE"
echo "   Patients: $PATIENTS_TABLE"
echo "   Logs: $LOGS_TABLE"
echo ""

# Install dependencies and seed data
echo "Installing Python dependencies..."
pip install -q boto3 bcrypt

echo "Seeding test data..."
python3 infrastructure/seed_data.py

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "   1. Create Alexa skill in Developer Console"
echo "   2. Deploy Lambda function"
echo "   3. Connect skill to Lambda"
