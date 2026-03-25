export type AppTab = 'home' | 'reminders' | 'symptoms' | 'chat' | 'profile' | 'users' | 'search' | 'summary' | 'telehealth' | 'settings';

export interface FavoriteMedicine {
  id: string;
  name: string;
  info: MedicineInfo;
}

export interface MedicineEntry {
  name: string;
  dosage: string;
}

export interface Reminder {
  id: string;
  medicines: MedicineEntry[];
  time: string;
  days: string[];
  dates?: string[];
  active: boolean;
  takenDates?: string[];
}

export interface SymptomHistoryItem {
  id: string;
  timestamp: number;
  symptoms: string;
  analysis: any;
  imageUrl?: string;
}

export interface MedicineInfo {
  name: string;
  usage: string;
  dosage: string;
  sideEffects: string;
  interactions: string;
  precautions: string;
  contraindications: string;
  storage: string;
  pregnancySafety: string;
  activeIngredients: string;
  manufacturerInfo: string;
  doctorAdvice: string;
  imageUrl?: string;
  userImageUrl?: string;
}

export interface NearbyPlace {
  name: string;
  address: string;
  distance: string;
  rating?: number;
  phone?: string;
  mapsUrl: string;
}

export interface DoctorRecommendation {
  name: string;
  specialty: string;
  address: string;
  distance: string;
  phone: string;
  mapsUrl: string;
}

export interface Appointment {
  id: string;
  userId: string;
  doctorUid?: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  reason: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: number;
}

export interface VitalSigns {
  id: string;
  userId: string;
  timestamp: number;
  weight?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  bloodSugar?: number;
}

export interface Doctor {
  uid: string;
  name: string;
  speciality: string;
  sittingTime: string;
  daysAvailable: string[];
  hospitalName: string;
  phone: string;
  email?: string;
  createdAt?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: string;
  consultationId?: string;
}
