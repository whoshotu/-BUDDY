#!/usr/bin/env python3
"""
Seed data script for Buddy MVP
Inserts test caregiver and patient into DynamoDB
"""

import boto3
import json
from datetime import datetime, timezone
from decimal import Decimal

# Configuration
REGION = "us-east-1"
ENVIRONMENT = "dev"

# Table names
CAREGIVERS_TABLE = f"BuddyCaregivers-{ENVIRONMENT}"
PATIENTS_TABLE = f"BuddyPatients-{ENVIRONMENT}"
ASSIGNMENTS_TABLE = f"BuddyAssignments-{ENVIRONMENT}"

# Seed data - Assignment (links caregiver to patient)
ASSIGNMENT = {
    "caregiverId": "cg-001",
    "patientId": "pt-001",
    "assignedAt": datetime.now(timezone.utc).isoformat(),
    "isPrimary": True,
    # Minimal patient snapshot for list views (avoids full patient record fetch)
    "patientSnapshot": {
        "preferredName": "John",
        "dementiaStage": "moderate",
        "lastActivityAt": None
    }
}

# Seed data - Caregiver
# Password: Demo2026! (bcrypt hash)
CAREGIVER = {
    "username": "caregiver_test",
    "caregiverId": "cg-001",
    "displayName": "Caregiver Test",
    "passwordHash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJ/IiS",  # Demo2026!
    "phoneNumber": "+15550123",
    "notificationPreferences": {
        "smsEnabled": True,
        "quietHoursStart": "22:00",
        "quietHoursEnd": "07:00",
        "level1Alerts": True,
        "level2Alerts": True
    },
    "createdAt": datetime.now(timezone.utc).isoformat(),
    "updatedAt": datetime.now(timezone.utc).isoformat()
}

# Seed data - Patient (John Doe)
# Note: caregiverId removed from here - now in BuddyAssignments table
PATIENT = {
    "patientId": "pt-001",
    "name": "John Doe",
    "preferredName": "John",
    "birthdate": "1950-03-15",
    "dementiaStage": "moderate",
    # Activity metadata for dashboard performance
    "lastConversationAt": None,
    "lastEscalationLevel": 0,
    "conversationCountToday": 0,
    "lastModifiedAt": datetime.now(timezone.utc).isoformat(),
    "lastModifiedBy": "system",
    "_version": 1,
    "people": [
        {
            "personId": "p-001",
            "name": "Sarah",
            "relationship": "daughter",
            "visitSchedule": "Tuesdays",
            "sharedActivities": ["gardening"],
            "photoUrl": None
        }
    ],
    "routines": [
        {
            "routineId": "r-001",
            "timeOfDay": "morning",
            "steps": [
                {
                    "stepId": "s-001",
                    "text": "Brush your teeth.",
                    "context": "Your toothbrush is in the blue cup by the sink."
                },
                {
                    "stepId": "s-002",
                    "text": "Take your medication.",
                    "context": None
                },
                {
                    "stepId": "s-003",
                    "text": "Eat breakfast.",
                    "context": None
                }
            ]
        },
        {
            "routineId": "r-002",
            "timeOfDay": "afternoon",
            "steps": [
                {
                    "stepId": "s-004",
                    "text": "Have lunch.",
                    "context": None
                },
                {
                    "stepId": "s-005",
                    "text": "Take a short walk.",
                    "context": "Walk around the living room or garden."
                }
            ]
        },
        {
            "routineId": "r-003",
            "timeOfDay": "evening",
            "steps": [
                {
                    "stepId": "s-006",
                    "text": "Have dinner.",
                    "context": None
                },
                {
                    "stepId": "s-007",
                    "text": "Watch your favorite show.",
                    "context": "The news is on at 6 PM."
                },
                {
                    "stepId": "s-008",
                    "text": "Get ready for bed.",
                    "context": "Your pajamas are in the top drawer."
                }
            ]
        }
    ],
    "medications": [
        {
            "medicationId": "m-001",
            "name": "Donepezil",
            "timing": "after breakfast",
            "appearance": "small white round pill",
            "notes": "Take with food"
        }
    ],
    "safetyProfile": {
        "caregiverPhone": "+15550123",
        "emergencyContacts": ["Sarah", "Neighbor Tom"],
        "allergies": ["penicillin"],
        "knownTriggers": ["nighttime confusion", "crowds"],
        "medicalConditions": ["Alzheimer's", "hypertension"]
    }
}


def seed_data():
    """Insert seed data into DynamoDB tables"""
    dynamodb = boto3.resource('dynamodb', region_name=REGION)
    
    caregivers_table = dynamodb.Table(CAREGIVERS_TABLE)
    patients_table = dynamodb.Table(PATIENTS_TABLE)
    assignments_table = dynamodb.Table(ASSIGNMENTS_TABLE)
    
    print(f"Seeding {CAREGIVERS_TABLE}...")
    caregivers_table.put_item(Item=CAREGIVER)
    print(f"  ✓ Inserted caregiver: {CAREGIVER['username']}")
    
    print(f"Seeding {PATIENTS_TABLE}...")
    patients_table.put_item(Item=PATIENT)
    print(f"  ✓ Inserted patient: {PATIENT['preferredName']} ({PATIENT['patientId']})")
    
    print(f"Seeding {ASSIGNMENTS_TABLE}...")
    assignments_table.put_item(Item=ASSIGNMENT)
    print(f"  ✓ Inserted assignment: {ASSIGNMENT['caregiverId']} → {ASSIGNMENT['patientId']}")
    
    print("\n✅ Seed data inserted successfully!")
    print(f"\nTest Credentials:")
    print(f"  Username: {CAREGIVER['username']}")
    print(f"  Password: Demo2026!")
    print(f"  Patient: {PATIENT['preferredName']}")


def verify_data():
    """Verify seed data was inserted correctly"""
    dynamodb = boto3.resource('dynamodb', region_name=REGION)
    
    caregivers_table = dynamodb.Table(CAREGIVERS_TABLE)
    patients_table = dynamodb.Table(PATIENTS_TABLE)
    assignments_table = dynamodb.Table(ASSIGNMENTS_TABLE)
    
    print("\nVerifying data...")
    
    # Check caregiver
    response = caregivers_table.get_item(Key={"username": "caregiver_test"})
    if 'Item' in response:
        print(f"  ✓ Caregiver found: {response['Item']['displayName']}")
        print(f"    - Phone: {response['Item'].get('phoneNumber', 'N/A')}")
        print(f"    - SMS enabled: {response['Item'].get('notificationPreferences', {}).get('smsEnabled', False)}")
    else:
        print("  ✗ Caregiver not found!")
    
    # Check patient
    response = patients_table.get_item(Key={"patientId": "pt-001"})
    if 'Item' in response:
        patient = response['Item']
        print(f"  ✓ Patient found: {patient['preferredName']}")
        print(f"    - People: {len(patient['people'])}")
        print(f"    - Routines: {len(patient['routines'])}")
        print(f"    - Medications: {len(patient['medications'])}")
        print(f"    - Version: {patient.get('_version', 'N/A')}")
    else:
        print("  ✗ Patient not found!")
    
    # Check assignment
    response = assignments_table.get_item(Key={
        "caregiverId": "cg-001",
        "patientId": "pt-001"
    })
    if 'Item' in response:
        assignment = response['Item']
        print(f"  ✓ Assignment found: {assignment['caregiverId']} → {assignment['patientId']}")
        print(f"    - Is primary: {assignment.get('isPrimary', False)}")
        print(f"    - Assigned at: {assignment.get('assignedAt', 'N/A')}")
    else:
        print("  ✗ Assignment not found!")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--verify":
        verify_data()
    else:
        seed_data()
