#!/bin/bash
set -e

# Deploy Buddy Nova Sonic WebSocket API
# Usage: ./deploy-websocket.sh [--environment dev|prod] [--region us-east-1]

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

echo "🚀 Deploying Buddy Nova Sonic WebSocket API..."
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

# Deploy WebSocket API CloudFormation
echo "📦 Deploying WebSocket API..."
aws cloudformation deploy \
    --template-file infrastructure/websocket-api.yaml \
    --stack-name "buddy-nova-sonic-websocket-${ENVIRONMENT}" \
    --parameter-overrides \
        Environment="${ENVIRONMENT}" \
        LambdaRoleArn="${ROLE_ARN}" \
    --region "${REGION}" \
    --capabilities CAPABILITY_IAM

# Get WebSocket endpoint
WEBSOCKET_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name "buddy-nova-sonic-websocket-${ENVIRONMENT}" \
    --region "${REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`WebSocketApiEndpoint`].OutputValue' \
    --output text)

# Navigate to WebSocket Lambda directory
cd src/nova-sonic-websocket

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install --production

# Create deployment package
echo "📦 Creating deployment package..."
zip -r websocket-lambda.zip index.js package.json node_modules/ -x "*.DS_Store" -x "*/.git/*"

# Deploy Lambda function
echo "🚀 Deploying WebSocket Lambda function..."
FUNCTION_NAME="buddy-nova-sonic-websocket-${ENVIRONMENT}"

if aws lambda get-function --function-name "${FUNCTION_NAME}" --region "${REGION}" > /dev/null 2>&1; then
    echo "   Function exists. Updating code..."
    aws lambda update-function-code \
        --function-name "${FUNCTION_NAME}" \
        --zip-file fileb://websocket-lambda.zip \
        --region "${REGION}"
else
    echo "   ${RED}❌ Function should have been created by CloudFormation${NC}"
    exit 1
fi

# Cleanup
rm websocket-lambda.zip
cd ../..

# Save WebSocket endpoint to .env
echo "WEBSOCKET_ENDPOINT=${WEBSOCKET_ENDPOINT}" >> .env

echo ""
echo "${GREEN}✅ Nova Sonic WebSocket deployment complete!${NC}"
echo ""
echo "📋 Configuration:"
echo "   WebSocket Endpoint: ${YELLOW}${WEBSOCKET_ENDPOINT}${NC}"
echo ""
echo "📋 Next Steps:"
echo "   1. Test WebSocket connection with wscat:"
echo "      npm install -g wscat"
echo "      wscat -c ${WEBSOCKET_ENDPOINT}"
echo ""
echo "   2. Send test message:"
echo "      {\"action\":\"initSession\",\"patientId\":\"pt-001\"}"
echo ""
echo "   3. For integration with Alexa:"
echo "      - Use the WebSocket for advanced speech-to-speech"
echo "      - Keep existing Lambda skill for simple intents"
echo ""
