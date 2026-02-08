# Buddy - Nova Sonic WebSocket Integration

Real-time speech-to-speech capabilities using Amazon Nova Sonic bidirectional streaming API.

## Overview

This module adds Nova Sonic integration to Buddy, enabling natural voice conversations with interruption handling (barge-in) and adaptive speech responses. It runs alongside the traditional Alexa skill.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Web/Mobile)                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Audio Capture → WebSocket → Nova Sonic Processing     │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
┌───────────────────────┐      ┌──────────────────────────┐
│  WebSocket API GW     │      │  Traditional Alexa Skill │
│  (Real-time S2S)      │      │  (Intent-based)          │
└───────────┬───────────┘      └────────────┬─────────────┘
            │                               │
            ▼                               ▼
┌───────────────────────┐      ┌──────────────────────────┐
│  Nova Sonic Handler   │      │  Lambda (index.js)       │
│  (WebSocket Lambda)   │      │  (Phase 2)               │
└───────────┬───────────┘      └──────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Amazon Bedrock                            │
│         Nova Sonic (amazon.nova-sonic-v1:0)                  │
│  - Bidirectional streaming                                   │
│  - Natural turn-taking                                       │
│  - Barge-in support                                          │
│  - Adaptive speech                                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
            ▼                               ▼
┌───────────────────────┐      ┌──────────────────────────┐
│    DynamoDB           │      │    SNS (Alerts)          │
│  - Patient data       │      │  - Safety escalation     │
│  - Conversation logs  │      │  - Caregiver SMS         │
└───────────────────────┘      └──────────────────────────┘
```

## When to Use Each Mode

### Traditional Alexa Skill (Phase 2)
**Use for:**
- Simple, structured queries ("What do I do this morning?")
- Medication reminders with disclaimers
- Routine step-by-step guidance
- Fallback when WebSocket unavailable

**Benefits:**
- Simple request/response model
- Works with all Alexa devices
- No custom client needed

### Nova Sonic WebSocket (Phase 3)
**Use for:**
- Natural conversations
- Elderly patients who need interruption support
- Complex multi-turn discussions
- Emotional support conversations

**Benefits:**
- Natural turn-taking
- Barge-in (interruption) handling
- Adaptive speech patterns
- More human-like interaction

## WebSocket Protocol

### Connection

```javascript
const ws = new WebSocket('wss://xxx.execute-api.us-east-1.amazonaws.com/dev');
```

### Messages

#### Initialize Session
```json
{
  "action": "initSession",
  "patientId": "pt-001"
}
```

#### Send Audio (Base64 encoded PCM)
```json
{
  "action": "audioInput",
  "audio": "base64_encoded_pcm_audio..."
}
```

#### Send Text (for testing)
```json
{
  "action": "textInput",
  "text": "What should I do now?"
}
```

### Responses

#### Audio Output
```json
{
  "type": "audioOutput",
  "audio": "base64_encoded_audio..."
}
```

#### Text Transcription
```json
{
  "type": "textOutput",
  "text": "Let's brush your teeth",
  "role": "ASSISTANT"
}
```

## Deployment

```bash
# Deploy WebSocket API and Lambda
./deploy-websocket.sh --environment dev --region us-east-1

# Get WebSocket endpoint
wscat -c $(grep WEBSOCKET_ENDPOINT .env | cut -d= -f2)
```

## Testing

### Using wscat
```bash
# Install wscat
npm install -g wscat

# Connect
wscat -c wss://xxx.execute-api.us-east-1.amazonaws.com/dev

# Initialize session
> {"action":"initSession","patientId":"pt-001"}

# Send text
> {"action":"textInput","text":"Who is Sarah?"}
```

### Using Web Client
See `/examples/websocket-client.html` for a complete browser-based client.

## Configuration

### Environment Variables
```bash
PATIENTS_TABLE=BuddyPatients-dev
LOGS_TABLE=BuddyConversationLogs-dev
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:xxx:buddy-alerts-dev
WEBSOCKET_API_ENDPOINT=wss://xxx.execute-api.us-east-1.amazonaws.com/dev
```

### Nova Sonic Settings
- **Model**: `amazon.nova-sonic-v1:0`
- **Temperature**: 0.4 (consistent responses)
- **Max Tokens**: 1024
- **Audio Format**: PCM 24kHz mono

## Dementia-Friendly Features

### System Prompt Engineering
The WebSocket handler uses a specialized prompt:

```
You are Buddy, a calm and patient voice assistant helping [Name] 
who has [stage] dementia.

CRITICAL INSTRUCTIONS:
1. Use VERY short sentences (5-10 words max)
2. Speak slowly and clearly
3. Be warm, reassuring, and never rush
4. If they repeat themselves, respond with EXACT same answer
5. Never correct them or argue
6. Use their preferred name frequently
7. Offer gentle reminders about routine
8. Help them feel safe if confused
```

### Barge-In Handling
Nova Sonic automatically handles interruptions:
- Patient can interrupt mid-sentence
- Context is preserved
- Natural flow maintained
- No frustration from waiting

## Security

- **WebSocket connections**: WSS (TLS encrypted)
- **Authentication**: Can add API Gateway Lambda authorizer
- **Patient isolation**: Each connection tied to patientId
- **Rate limiting**: Configured in API Gateway (100 burst, 50/sec)

## Limitations

- **Max session duration**: 8 minutes (Nova Sonic limit)
- **Audio format**: PCM 24kHz mono (16-bit)
- **Latency**: ~500ms-2s depending on network
- **Not HIPAA compliant**: Demo/hackathon scope

## Integration with Alexa

### Option 1: Hybrid Mode (Recommended)
Use both systems:
1. Alexa skill for simple queries
2. WebSocket for extended conversations
3. Seamless handoff between modes

### Option 2: Custom Device
Build custom device with:
- WebSocket client
- Audio capture/playback
- Direct Nova Sonic integration
- No Alexa dependency

### Option 3: Future Alexa Integration
When Alexa supports custom bidirectional streaming:
- Migrate WebSocket logic to Alexa skill
- Keep same Nova Sonic backend
- Best of both worlds

## Monitoring

```bash
# View WebSocket Lambda logs
aws logs tail /aws/lambda/buddy-nova-sonic-websocket-dev --follow

# Monitor WebSocket connections
aws apigatewayv2 get-connections --api-id xxx

# Check CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name MessageCount \
  --dimensions Name=ApiId,Value=xxx
```

## Cost Estimation

Per 1-hour conversation:
- WebSocket API: ~$0.01 (1M messages)
- Nova Sonic: ~$0.15-0.30 (varies by usage)
- Lambda: ~$0.005 (512MB, 15min)
- **Total**: ~$0.17-0.32 per hour

## Troubleshooting

### Connection Issues
- Check security groups
- Verify WSS (not WS)
- Check API Gateway limits

### Audio Quality
- Verify PCM format (24kHz, mono, 16-bit)
- Check base64 encoding
- Ensure proper audio buffering

### Latency
- Check network connection
- Monitor Nova Sonic response times
- Consider regional deployment

## Future Enhancements

- [ ] Multi-language support
- [ ] Custom voice training
- [ ] Proactive health monitoring
- [ ] Integration with wearables
- [ ] Video support (Nova 2 Omni)

## References

- [Amazon Nova Sonic Documentation](https://docs.aws.amazon.com/nova/latest/userguide/speech.html)
- [WebSocket API Guide](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html)
- [Bidirectional Streaming API](https://docs.aws.amazon.com/nova/latest/userguide/speech-bidirection.html)

## License

MIT License - Amazon Nova Hackathon 2026
