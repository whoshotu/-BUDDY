# Buddy Documentation

Complete documentation for the Buddy Voice-First Dementia Care Assistant.

## Quick Navigation

### For Hackathon Judges

- [Executive Summary](EXECUTIVE_SUMMARY.md) - Project overview and key features
- [Demo Script](DEMO_SCRIPT.md) - Step-by-step demonstration guide
- [Architecture](ARCHITECTURE.md) - System design and technical overview

### For Developers

- [Setup Guide](SETUP.md) - Installation and configuration
- [API Documentation](API.md) - REST API reference
- [Deployment Guide](DEPLOYMENT.md) - Deployment strategies and procedures

### For Operations

- [Emergency Features](EMERGENCY.md) - Safety escalation system
- [Monitoring](MONITORING.md) - CloudWatch dashboards and alerts
- [Database Optimization](DYNAMODB_OPTIMIZATION.md) - Performance tuning

### For Testing

- [Beta Testing](BETA_TESTING.md) - Testing procedures and scenarios
- [Testing Scripts](../test/) - Automated test suite

## Project Structure

```text
buddy/
├── docs/                    # Documentation
├── src/
│   ├── alexa-skill/        # Alexa Lambda function
│   ├── caregiver-dashboard/ # React web interface
│   └── nova-sonic-websocket/ # Advanced speech-to-speech
├── infrastructure/         # CloudFormation templates
├── scripts/               # Deployment scripts
├── test/                  # Test suite
└── demo/                  # Demo materials
```

## Quick Start

1. **Deploy Infrastructure:**

   ```bash
   cd scripts
   ./deploy.sh --environment dev --region us-east-1
   ./deploy-iam.sh --environment dev --region us-east-1
   ./deploy-lambda.sh --environment dev --region us-east-1
   ```

2. **Test Emergency Flow:**

   ```bash
   cd test
   ./test-lambda.sh
   ```

3. **Run Dashboard:**

   ```bash
   cd src/caregiver-dashboard
   npm install
   npm run dev
   # Open http://localhost:3000
   ```

## Status

- **Phase 1:** Core Infrastructure ✅ Complete
- **Phase 2:** Agentic Workflow (Alexa Skill) ✅ Complete  
- **Phase 3:** Refinement (Nova Sonic, Emergency, Monitoring) ✅ Complete
- **Phase 4:** Polish & Documentation (Caregiver Dashboard) ✅ Complete
- **Phase 5:** Demo & Submission ✅ Complete

## License

MIT License - Amazon Nova AI Hackathon 2026
