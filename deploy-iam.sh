#!/bin/bash
set -e

# Deploy IAM Roles for Buddy Lambda Functions
# Creates execution role with permissions for DynamoDB, Bedrock, and SNS

ENVIRONMENT="dev"
REGION="us-east-1"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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
      echo "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

echo "🔐 Deploying IAM Roles..."
echo "   Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo "   Region: ${YELLOW}${REGION}${NC}"
echo ""

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Get DynamoDB table ARNs from CloudFormation
STACK_NAME="buddy-dynamodb"
CAREGIVERS_TABLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`CaregiversTableArn`].OutputValue' \
    --output text \
    --region "${REGION}" 2>/dev/null || echo "")

PATIENTS_TABLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`PatientsTableArn`].OutputValue' \
    --output text \
    --region "${REGION}" 2>/dev/null || echo "")

LOGS_TABLE_ARN=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}-${ENVIRONMENT}" \
    --query 'Stacks[0].Outputs[?OutputKey==`ConversationLogsTableArn`].OutputValue' \
    --output text \
    --region "${REGION}" 2>/dev/null || echo "")

if [ -z "$CAREGIVERS_TABLE_ARN" ]; then
    echo "${RED}❌ DynamoDB tables not found. Run ./deploy.sh first.${NC}"
    exit 1
fi

echo "📊 Found tables:"
echo "   Caregivers: ${CAREGIVERS_TABLE_ARN}"
echo "   Patients: ${PATIENTS_TABLE_ARN}"
echo "   Logs: ${LOGS_TABLE_ARN}"
echo ""

# Create trust policy for Lambda
cat > /tmp/lambda-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create or update IAM role
ROLE_NAME="buddy-lambda-role-${ENVIRONMENT}"

echo "🔧 Creating/updating IAM role: ${ROLE_NAME}..."

# Check if role exists
if aws iam get-role --role-name "${ROLE_NAME}" > /dev/null 2>&1; then
    echo "   Role exists, updating trust policy..."
    aws iam update-assume-role-policy \
        --role-name "${ROLE_NAME}" \
        --policy-document file:///tmp/lambda-trust-policy.json
else
    echo "   Creating new role..."
    aws iam create-role \
        --role-name "${ROLE_NAME}" \
        --assume-role-policy-document file:///tmp/lambda-trust-policy.json \
        --description "Execution role for Buddy Alexa Lambda"
fi

# Create inline policy for DynamoDB, Bedrock, and SNS access
cat > /tmp/buddy-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/aws/lambda/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "${CAREGIVERS_TABLE_ARN}",
        "${PATIENTS_TABLE_ARN}",
        "${LOGS_TABLE_ARN}",
        "${CAREGIVERS_TABLE_ARN}/index/*",
        "${PATIENTS_TABLE_ARN}/index/*",
        "${LOGS_TABLE_ARN}/index/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "arn:aws:sns:${REGION}:${ACCOUNT_ID}:buddy-alerts-${ENVIRONMENT}"
    }
  ]
}
EOF

# Attach or update policy
POLICY_NAME="buddy-lambda-policy"
echo "📎 Attaching permissions policy..."

# Remove old policy if exists
aws iam delete-role-policy \
    --role-name "${ROLE_NAME}" \
    --policy-name "${POLICY_NAME}" 2>/dev/null || true

# Attach new policy
aws iam put-role-policy \
    --role-name "${ROLE_NAME}" \
    --policy-name "${POLICY_NAME}" \
    --policy-document file:///tmp/buddy-policy.json

# Get role ARN
ROLE_ARN=$(aws iam get-role --role-name "${ROLE_NAME}" --query 'Role.Arn' --output text)

echo "${GREEN}✅ IAM Role deployed${NC}"
echo "   Role ARN: ${YELLOW}${ROLE_ARN}${NC}"
echo ""

# Create SNS topic for alerts
echo "📢 Creating SNS topic for alerts..."
SNS_TOPIC_NAME="buddy-alerts-${ENVIRONMENT}"

SNS_TOPIC_ARN=$(aws sns create-topic \
    --name "${SNS_TOPIC_NAME}" \
    --region "${REGION}" \
    --query 'TopicArn' \
    --output text 2>/dev/null || aws sns list-topics \
    --region "${REGION}" \
    --query "Topics[?contains(@, '${SNS_TOPIC_NAME}')]" \
    --output text)

echo "${GREEN}✅ SNS Topic ready${NC}"
echo "   Topic ARN: ${YELLOW}${SNS_TOPIC_ARN}${NC}"
echo ""

# Save to .env
echo "ROLE_ARN=${ROLE_ARN}" >> .env
echo "SNS_TOPIC_ARN=${SNS_TOPIC_ARN}" >> .env

echo "${GREEN}✅ IAM Setup Complete!${NC}"
echo ""
echo "📋 Summary:"
echo "   Role: ${ROLE_ARN}"
echo "   SNS:  ${SNS_TOPIC_ARN}"
echo ""
echo "🔗 Next Step: Deploy Lambda function"
echo "   ./deploy-lambda.sh"
