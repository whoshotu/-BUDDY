# Buddy Caregiver Dashboard

A React-based dashboard for caregivers to monitor dementia patients using Buddy.

## Features

- **Patient Overview**: View patient profile, medical conditions, and safety information
- **Real-time Monitoring**: Track conversations and safety alerts
- **Alert Management**: Acknowledge and manage Level 1 & Level 2 safety alerts
- **Conversation History**: Review all patient-Alexa interactions
- **Safety Dashboard**: Visual indicators for emergency and concerning behaviors

## Quick Start

```bash
cd src/caregiver-dashboard

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

## Demo Data

The dashboard includes mock data for demonstration:
- **Patient**: John Doe (moderate dementia)
- **Conversations**: Mix of routine queries and safety escalations
- **Alerts**: Example Level 1 and Level 2 alerts

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **date-fns** - Date formatting
- **React Router** - Navigation

## Dashboard Sections

### Overview Tab
- Patient profile card
- Quick stats (conversations, alerts)
- Safety profile (emergency contacts, medical info)
- Recent activity preview

### Conversations Tab
- Complete conversation history
- Intent classification
- Escalation level indicators
- Caregiver notification status

### Alerts Tab
- All safety alerts (Level 1 & 2)
- Acknowledgment status
- Timestamp and severity
- One-click acknowledgment

## Production Deployment

### Build
```bash
npm run build
```

### Deploy to S3 + CloudFront
```bash
# Sync build folder to S3
aws s3 sync dist/ s3://buddy-dashboard-dev --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id XYZ --paths "/*"
```

## API Integration (Future)

Connect to FastAPI backend:

```typescript
// src/api/client.ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

### Endpoints Needed

- `GET /api/patients` - List patients
- `GET /api/patients/{id}` - Patient details
- `GET /api/patients/{id}/conversations` - Conversation history
- `GET /api/patients/{id}/alerts` - Safety alerts
- `POST /api/alerts/{id}/acknowledge` - Acknowledge alert

## Development

### Project Structure
```
src/
├── components/     # Reusable UI components
├── pages/         # Page components
├── types/         # TypeScript interfaces
├── mocks/         # Mock data for demo
├── api/           # API client (future)
└── utils/         # Utility functions
```

### Adding New Features

1. **New Page**: Add to `src/pages/` and update `App.tsx`
2. **New Component**: Create in `src/components/`
3. **New Type**: Add to `src/types/index.ts`
4. **New Mock**: Add to `src/mocks/data.ts`

## Demo Scenarios

The dashboard shows realistic scenarios:

1. **Normal Day**: Routine conversations, no alerts
2. **Concerning Behavior**: Repeated questions (Level 1)
3. **Emergency**: Fall detected (Level 2)
4. **Mixed**: Various intents and escalation levels

## License

MIT License - Amazon Nova Hackathon 2026
