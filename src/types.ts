export interface MedicineEntry {
  name: string;
  dosage: string;
}

export interface Reminder {
  id: string;
  medicines: MedicineEntry[];
  time: string;
  dates: string[]; // Specific dates for the reminder (YYYY-MM-DD)
  days: string[];
  active: boolean;
  takenDates?: string[]; // ISO date strings
}

export interface SymptomHistoryItem {
  id: string;
  timestamp: number;
  symptoms: string;
  analysis: any; // SymptomAnalysis
}

export interface FavoriteMedicine {
  id: string;
  name: string;
  info: any; // MedicineInfo
}

export type AppTab = 'home' | 'search' | 'symptoms' | 'chat' | 'reminders' | 'summary' | 'settings' | 'telehealth' | 'users';
