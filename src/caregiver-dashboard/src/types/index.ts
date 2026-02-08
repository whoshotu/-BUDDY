export interface Patient {
  patientId: string;
  preferredName: string;
  fullName: string;
  dementiaStage: 'mild' | 'moderate' | 'severe';
  dateOfBirth: string;
  safetyProfile: {
    caregiverPhone: string;
    emergencyContacts: string[];
    medicalConditions: string[];
    allergies: string[];
  };
  lastConversationAt: string;
  lastEscalationLevel: number;
}

export interface Conversation {
  patientId: string;
  timestamp: string;
  userUtterance: string;
  assistantResponse: string;
  intent: string;
  escalationLevel: number;
  caregiverNotified: boolean;
}

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  level: 1 | 2;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface Caregiver {
  caregiverId: string;
  displayName: string;
  phoneNumber: string;
  notificationPreferences: {
    smsEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    level1Alerts: boolean;
    level2Alerts: boolean;
  };
}
