import type { Patient, Conversation, Alert } from '../types';

export const mockPatient: Patient = {
  patientId: 'pt-001',
  preferredName: 'John',
  fullName: 'John Doe',
  dementiaStage: 'moderate',
  dateOfBirth: '1950-03-15',
  safetyProfile: {
    caregiverPhone: '+15551234567',
    emergencyContacts: ['Sarah (daughter): +15559876543', 'Neighbor Tom: +15555678901'],
    medicalConditions: ["Alzheimer's Disease", 'Hypertension', 'Type 2 Diabetes'],
    allergies: ['Penicillin', 'Shellfish']
  },
  lastConversationAt: new Date().toISOString(),
  lastEscalationLevel: 0
};

export const mockConversations: Conversation[] = [
  {
    patientId: 'pt-001',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    userUtterance: 'What do I do this morning?',
    assistantResponse: 'Good morning John! Time to brush your teeth and wash your face.',
    intent: 'RoutineIntent',
    escalationLevel: 0,
    caregiverNotified: false
  },
  {
    patientId: 'pt-001',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    userUtterance: 'Who is Sarah?',
    assistantResponse: 'Sarah is your daughter. She visits on Sundays and likes to garden with you.',
    intent: 'WhoIsIntent',
    escalationLevel: 0,
    caregiverNotified: false
  },
  {
    patientId: 'pt-001',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    userUtterance: 'Where am I?',
    assistantResponse: "You're at home, John. You're safe here.",
    intent: 'LocationIntent',
    escalationLevel: 1,
    caregiverNotified: true
  },
  {
    patientId: 'pt-001',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
    userUtterance: "I'm scared",
    assistantResponse: "It's okay John, you're safe. I'm here with you.",
    intent: 'EmotionIntent',
    escalationLevel: 1,
    caregiverNotified: true
  },
  {
    patientId: 'pt-001',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    userUtterance: 'I fell down',
    assistantResponse: "I'm contacting your caregiver now. Stay with me.",
    intent: 'EmergencyIntent',
    escalationLevel: 2,
    caregiverNotified: true
  }
];

export const mockAlerts: Alert[] = [
  {
    id: 'alert-001',
    patientId: 'pt-001',
    patientName: 'John',
    level: 2,
    message: 'URGENT: John said "I fell down". Initiating emergency protocol.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    acknowledged: true
  },
  {
    id: 'alert-002',
    patientId: 'pt-001',
    patientName: 'John',
    level: 1,
    message: "Buddy Alert: John said \"I'm scared\" 4+ times in 2 hours.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    acknowledged: true
  },
  {
    id: 'alert-003',
    patientId: 'pt-001',
    patientName: 'John',
    level: 1,
    message: 'Buddy Alert: John said "Where am I?" 4+ times in 2 hours.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    acknowledged: false
  }
];
