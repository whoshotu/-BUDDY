#!/bin/bash
set -e

# Deploy Buddy CloudWatch Monitoring
# Usage: ./deploy-monitoring.sh [--environment dev|prod] [--region us-east-1]

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

echo "📊 Deploying Buddy CloudWatch Monitoring..."
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

# Check for SNS topic
if [ -z "$SNS_TOPIC_ARN" ]; then
    echo "${YELLOW}⚠️  SNS Topic not found. Creating one for alarms...${NC}"
    
    # Create SNS topic
    SNS_TOPIC_ARN=$(aws sns create-topic \
        --name "buddy-monitoring-${ENVIRONMENT}" \
        --region "${REGION}" \
        --query 'TopicArn' \
        --output text)
    
    echo "SNS_TOPIC_ARN=${SNS_TOPIC_ARN}" >> .env
    echo "${GREEN}✅ Created SNS topic: ${SNS_TOPIC_ARN}${NC}"
fi

# Deploy CloudFormation
echo "📦 Deploying CloudWatch monitoring..."
aws cloudformation deploy \
    --template-file infrastructure/monitoring.yaml \
    --stack-name "buddy-monitoring-${ENVIRONMENT}" \
    --parameter-overrides \
        Environment="${ENVIRONMENT}" \
        LambdaFunctionName="buddy-alexa-skill-${ENVIRONMENT}" \
        WebSocketLambdaName="buddy-nova-sonic-websocket-${ENVIRONMENT}" \
        SNSTopicArn="${SNS_TOPIC_ARN}" \
    --region "${REGION}" \
    --capabilities CAPABILITY_IAM

# Get dashboard URL
DASHBOARD_URL=$(aws cloudformation describe-stacks \
    --stack-name "buddy-monitoring-${ENVIRONMENT}" \
    --region "${REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`DashboardURL`].OutputValue' \
    --output text)

echo ""
echo "${GREEN}✅ CloudWatch monitoring deployed!${NC}"
echo ""
echo "📊 Dashboard URL:"
echo "   ${YELLOW}${DASHBOARD_URL}${NC}"
echo ""
echo "📊 Configured Alarms:"
echo "   - Lambda Error Rate (> 5 errors in 10 min)"
echo "   - Lambda Duration (> 10 seconds average)"
echo "   - DynamoDB Throttling"
echo "   - Emergency Escalations (> 1 per day)"
echo ""
echo "📊 Custom Metrics:"
echo "   - Buddy/Safety:EmergencyEscalations"
echo "   - Buddy/Safety:SafetyAlerts"
echo "   - Buddy/Usage:Conversations"
echo ""
echo "📋 Next Steps:"
echo "   1. Subscribe to SNS topic for alarm notifications:"
echo "      aws sns subscribe --topic-arn ${SNS_TOPIC_ARN} --protocol email --notification-endpoint your@email.com"
echo ""
echo "   2. View logs:"
echo "      aws logs tail /aws/lambda/buddy-alexa-skill-${ENVIRONMENT} --follow"
echo ""
echo "   3. Test alarm:"
echo "      aws cloudwatch set-alarm-state --alarm-name buddy-lambda-errors-${ENVIRONMENT} --state-value ALARM --state-reason testing"
echo ""
