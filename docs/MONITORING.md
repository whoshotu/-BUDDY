# CloudWatch Monitoring Guide

Buddy implements comprehensive monitoring using Amazon CloudWatch, including custom dashboards, metric filters, and automated alarms.

## Monitoring Architecture

Buddy tracks three types of metrics:

1. **AWS Service Metrics:** Lambda errors/duration, DynamoDB throttling, SNS delivery success.
2. **Usage Metrics:** Invocations, conversation counts, intent frequency.
3. **Safety Metrics:** Emergency escalations (Level 2), Concerning alerts (Level 1).

## CloudWatch Dashboard

A centralized dashboard `Buddy-Monitoring-dev` is provided to visualize system health.

### Dashboard Components

- **Lambda Invocations & Errors:** Tracking total requests and success rate.
- **Lambda Duration (ms):** Measuring response latency (p50 and p99).
- **Safety Alerts & Emergencies:** High-visibility counters for Level 1 and Level 2 events.
- **Conversations per Hour:** Tracking patient engagement.
- **DynamoDB Capacity:** Monitoring read/write throughput for all tables.
- **Emergency Logs:** Real-time log stream filtered for emergency keywords.

## Automated Alarms

The following alarms are configured to notify caregivers via SNS:

| Alarm Name | Condition | Severity |
| --- | --- | --- |
| `buddy-lambda-errors-dev` | > 1 error in 5 mins | High |
| `buddy-lambda-duration-dev` | > 10 seconds | Medium |
| `buddy-dynamodb-throttling-dev` | > 1 throttled request | Medium |
| `buddy-emergency-escalation-dev` | > 1 Level 2 event | CRITICAL |

## Custom Metrics

We use CloudWatch Logs Metric Filters to extract business logic from Lambda logs:

- **EmergencyEscalations:** Incremented when "EMERGENCY ESCALATION - Level 2" is logged.
- **SafetyAlerts:** Incremented when any caregiver alert is sent.
- **Conversations:** Incremented on every intent request.

## Accessing the Dashboard

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/).
2. Navigate to **CloudWatch** > **Dashboards**.
3. Select `Buddy-Monitoring-dev`.

To deploy or update the monitoring stack:

```bash
./scripts/deploy-monitoring.sh --environment dev
```
