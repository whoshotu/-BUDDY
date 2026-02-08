#!/bin/bash
set -e

# Deploy Buddy Alexa Skill Lambda Function
# Usage: ./deploy-lambda.sh [--environment dev|prod] [--region us-east-1]

ENVIRONMENT="dev"
REGION="us-east-1"
FUNCTION_NAME="buddy-alexa-skill"

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

echo "🚀 Deploying Buddy Alexa Lambda..."
echo "   Environment: ${YELLOW}${ENVIRONMENT}${NC}"
echo "   Region: ${YELLOW}${REGION}${NC}"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | xargs)
    echo "📋 Loaded configuration from .env"
else
    echo "${RED}❌ .env file not found. Run ./deploy.sh first.${NC}"
    exit 1
fi

# Check for IAM role
if [ -z "$ROLE_ARN" ]; then
    echo "${RED}❌ IAM Role not found. Run ./deploy-iam.sh first.${NC}"
    exit 1
fi

# Navigate to Lambda directory
cd src/alexa-skill

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install --production

# Create deployment package
echo "📦 Creating deployment package..."
zip -r lambda.zip index.js package.json node_modules/ -x "*.DS_Store" -x "*/.git/*"

# Check if function exists
FUNCTION_FULL_NAME="${FUNCTION_NAME}-${ENVIRONMENT}"
echo "🔍 Checking for existing function: ${FUNCTION_FULL_NAME}..."

if aws lambda get-function --function-name "${FUNCTION_FULL_NAME}" --region "${REGION}" > /dev/null 2>&1; then
    echo "   Function exists. Updating code..."
    
    # Update function code
    aws lambda update-function-code \
        --function-name "${FUNCTION_FULL_NAME}" \
        --zip-file fileb://lambda.zip \
        --region "${REGION}"
    
    # Update tracing configuration
    aws lambda update-function-configuration \
        --function-name "${FUNCTION_FULL_NAME}" \
        --tracing-config Mode=Active \
        --region "${REGION}"
    
    echo "${GREEN}✅ Function code updated${NC}"
else
    echo "   Creating new function..."
    
    # Create function
    aws lambda create-function \
        --function-name "${FUNCTION_FULL_NAME}" \
        --runtime nodejs18.x \
        --role "${ROLE_ARN}" \
        --handler index.handler \
        --zip-file fileb://lambda.zip \
        --region "${REGION}" \
        --timeout 8 \
        --memory-size 512 \
        --tracing-config Mode=Active \
        --environment Variables="{
            CAREGIVERS_TABLE=${CAREGIVERS_TABLE},
            PATIENTS_TABLE=${PATIENTS_TABLE},
            ASSIGNMENTS_TABLE=${ASSIGNMENTS_TABLE},
            LOGS_TABLE=${LOGS_TABLE},
            SNS_TOPIC_ARN=${SNS_TOPIC_ARN},
            NOVA_MODEL=amazon.nova-micro-v1:0,
            NODE_ENV=${ENVIRONMENT}
        }" \
        --description "Buddy - Voice-first dementia care assistant for Amazon Nova Hackathon"
    
    echo "${GREEN}✅ Function created${NC}"
fi

# Get function ARN
FUNCTION_ARN=$(aws lambda get-function \
    --function-name "${FUNCTION_FULL_NAME}" \
    --region "${REGION}" \
    --query 'Configuration.FunctionArn' \
    --output text)

echo ""
echo "📋 Function ARN: ${YELLOW}${FUNCTION_ARN}${NC}"
echo ""

# Add Alexa Skills Kit trigger
echo "🔗 Configuring Alexa Skills Kit trigger..."

# Add permission for Alexa Skills Kit to invoke Lambda
aws lambda add-permission \
    --function-name "${FUNCTION_FULL_NAME}" \
    --statement-id "alexa-skills-kit-trigger" \
    --action "lambda:InvokeFunction" \
    --principal "alexa-appkit.amazon.com" \
    --region "${REGION}" \
    --source-arn "arn:aws:alexa:skill:*:*" 2>/dev/null || true

echo "${GREEN}✅ Alexa Skills Kit trigger configured${NC}"

# Cleanup
rm lambda.zip
cd ../..

# Save function ARN to .env
echo "LAMBDA_ARN=${FUNCTION_ARN}" >> .env

echo ""
echo "${GREEN}✅ Lambda deployment complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo "   1. Update skill.json with your Lambda ARN:"
echo "      ${FUNCTION_ARN}"
echo "   2. Deploy skill manifest to Alexa Developer Console"
echo "   3. Test: 'Alexa, open Buddy Assistant'"
echo ""
echo "🔗 Skill Configuration:"
echo "   - Name: Buddy - Dementia Care Assistant"
echo "   - Invocation: 'buddy assistant'"
echo "   - Endpoint: ${FUNCTION_ARN}"
echo ""
