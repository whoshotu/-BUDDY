# Nova Sonic WebSocket Deployment Guide

## Prerequisites

- AWS CLI configured with appropriate credentials
- IAM role deployed (`./deploy-iam.sh`)
- DynamoDB tables deployed (`./deploy.sh`)
- Nova Sonic model access enabled in Bedrock

## Deployment Steps

### 1. Deploy Infrastructure

```bash
# Deploy WebSocket API Gateway and Lambda
./deploy-websocket.sh --environment dev --region us-east-1
```

This creates:
- API Gateway WebSocket API
- Lambda function with WebSocket handler
- CloudWatch log groups
- SNS topic for alerts

### 2. Manual Deployment (if needed)

If the script fails, deploy manually:

```bash
# 1. Deploy CloudFormation template
aws cloudformation deploy \
    --template-file infrastructure/websocket-api.yaml \
    --stack-name buddy-nova-sonic-websocket-dev \
    --parameter-overrides \
        Environment=dev \
        LambdaRoleArn=arn:aws:iam::YOUR_ACCOUNT:role/buddy-lambda-role-dev \
    --capabilities CAPABILITY_IAM

# 2. Get WebSocket endpoint
WEBSOCKET_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name buddy-nova-sonic-websocket-dev \
    --query 'Stacks[0].Outputs[?OutputKey==`WebSocketApiEndpoint`].OutputValue' \
    --output text)

echo "WebSocket Endpoint: $WEBSOCKET_ENDPOINT"

# 3. Deploy Lambda code
cd src/nova-sonic-websocket
npm install --production
zip -r websocket-lambda.zip index.js package.json node_modules/

aws lambda update-function-code \
    --function-name buddy-nova-sonic-websocket-dev \
    --zip-file fileb://websocket-lambda.zip

rm websocket-lambda.zip
cd ../..

# 4. Save endpoint
echo "WEBSOCKET_ENDPOINT=$WEBSOCKET_ENDPOINT" >> .env
```

### 3. Verify Deployment

```bash
# Check CloudFormation stack
aws cloudformation describe-stacks \
    --stack-name buddy-nova-sonic-websocket-dev \
    --query 'Stacks[0].StackStatus'

# Check Lambda function
aws lambda get-function \
    --function-name buddy-nova-sonic-websocket-dev \
    --query 'Configuration.State'

# Check WebSocket API
aws apigatewayv2 get-apis \
    --query 'Items[?Name==`buddy-nova-sonic-websocket-dev`].ApiId'
```

## Testing

### Test with wscat

```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c wss://xxxxx.execute-api.us-east-1.amazonaws.com/dev

# Send initialization
> {"action":"initSession","patientId":"pt-001"}

# Expected response:
# < {"status":"initialized","patientName":"John"}

# Send text input
> {"action":"textInput","text":"Who is Sarah?"}

# Expected response:
# < {"type":"textOutput","text":"Sarah is your daughter...","role":"ASSISTANT"}
```

### Test with Python

```python
import asyncio
import websockets
import json

async def test_websocket():
    uri = "wss://xxxxx.execute-api.us-east-1.amazonaws.com/dev"
    
    async with websockets.connect(uri) as websocket:
        # Initialize session
        await websocket.send(json.dumps({
            "action": "initSession",
            "patientId": "pt-001"
        }))
        
        response = await websocket.recv()
        print(f"Init response: {response}")
        
        # Send text
        await websocket.send(json.dumps({
            "action": "textInput",
            "text": "What do I do this morning?"
        }))
        
        response = await websocket.recv()
        print(f"Response: {response}")

asyncio.run(test_websocket())
```

## Troubleshooting

### Connection Refused

**Problem:** Can't connect to WebSocket
**Solutions:**
1. Check WebSocket endpoint URL
2. Verify API Gateway deployment stage exists
3. Check security groups allow WebSocket connections

### Lambda Timeout

**Problem:** Lambda times out during Nova Sonic streaming
**Solutions:**
1. Increase Lambda timeout (max 15 minutes for WebSocket)
2. Check Nova Sonic session initialization
3. Verify Bedrock permissions

### Nova Sonic Errors

**Problem:** "Model not available" or invocation errors
**Solutions:**
1. Enable Nova Sonic in Bedrock console
2. Check IAM permissions for bedrock:InvokeModel
3. Verify correct model ID: `amazon.nova-sonic-v1:0`

### Missing Patient Data

**Problem:** Patient context not found
**Solutions:**
1. Verify DynamoDB tables are populated
2. Check seed data was inserted: `python infrastructure/seed_data.py`
3. Verify patientId matches seed data

## Architecture

```
Client (Browser/Postman)
    ↓
API Gateway WebSocket
    ↓
Lambda Handler
    ↓
Amazon Bedrock Nova Sonic
    ↓ (bidirectional streaming)
DynamoDB (patient data)
SNS (alerts)
```

## Cost Considerations

- **API Gateway WebSocket**: $1.00/million messages + connection time
- **Lambda**: ~$0.20/hour (512MB, 15 min timeout)
- **Nova Sonic**: ~$0.003/minute of audio
- **Example**: 1-hour conversation ≈ $0.20-0.30

## Monitoring

View logs:
```bash
# Lambda logs
aws logs tail /aws/lambda/buddy-nova-sonic-websocket-dev --follow

# API Gateway logs
aws logs tail /aws/apigateway/buddy-nova-sonic-websocket-dev --follow
```

## Production Considerations

1. **Enable CloudWatch Logs** for API Gateway
2. **Set up WAF** for DDoS protection
3. **Configure throttling** limits
4. **Enable X-Ray** tracing
5. **Set up alarms** for error rates

## Cleanup

```bash
# Delete CloudFormation stack
aws cloudformation delete-stack \
    --stack-name buddy-nova-sonic-websocket-dev

# Verify deletion
aws cloudformation describe-stacks \
    --stack-name buddy-nova-sonic-websocket-dev
```
