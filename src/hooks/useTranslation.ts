import { useState, useEffect, useCallback } from 'react';
import { translateUI } from '../services/geminiService';

export function useTranslation(language: string) {
  const [translations, setTranslations] = useState<Record<string, string>>({});

  const translate = useCallback(async (texts: string[]) => {
    try {
      const result = await translateUI(texts, language === 'en' ? 'English' : 'Hindi');
      setTranslations(prev => ({ ...prev, ...result }));
    } catch (error) {
      console.error("Translation error:", error);
    }
  }, [language]);

  const t = useCallback((text: string) => {
    return translations[text] || text;
  }, [translations]);

  // Initial translation of common strings
  useEffect(() => {
    const commonStrings = [
      "Good Morning!", "How are you feeling today?", "Symptom Checker", "AI-powered analysis",
      "Medicine Search", "Find info instantly", "Upcoming Meds", "View All", "No active reminders for today.",
      "Recent History", "See History", "Your health checks will appear here.", "Health Tip of the Day",
      "Learn More", "Search by medicine name...", "Fetching medicine details...", "Description",
      "Dosage", "Status", "Verified", "Overview", "Uses", "Side Effects", "Warnings",
      "Search for Medicines", "Get detailed information about any medication instantly.",
      "How are you feeling?", "Describe your symptoms", "Analyze Now", "Add Photo", "Image Added",
      "Analysis Results", "Recommended Specialist", "Suggested Medicines", "Search Radius",
      "Recommended Doctors Near You", "Call Now", "Open in Maps", "Check History", "View Full Details",
      "Chat with Doctor", "Ask about any disease...", "Medication Alerts", "Taken today",
      "No reminders set yet.", "Add one to stay on track!", "New Reminder", "Medicines",
      "Add Medicine", "Medicine Name", "Time", "Dates", "Daily Schedule", "Add Date", "Add Reminder",
      "Telehealth Consultation", "Connect with healthcare professionals instantly", "Your Consultation ID",
      "Generating...", "Share this ID with your doctor or another user to receive a call.",
      "Start a Call", "Enter Doctor's ID...", "Start Video Consultation", "How it works",
      "Share your ID with a healthcare provider.", "Or enter the provider's ID to initiate a call.",
      "Ensure you have a stable internet connection.", "Grant camera and microphone permissions when prompted.",
      "Incoming Call", "A doctor is requesting a consultation", "Decline", "Accept", "Connecting...",
      "Daily Summary", "Meds", "Taken", "Checks", "Medication Schedule", "No medications scheduled for today.",
      "Today's Check-ins", "No health checks performed today.", "Sign Out", "Language", "Dashboard",
      "Health Summary", "Telehealth"
    ];
    translate(commonStrings);
  }, [translate]);

  return { t, translate };
}
