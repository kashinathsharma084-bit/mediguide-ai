import { GoogleGenAI, Type, ThinkingLevel, FunctionDeclaration } from "@google/genai";
import { db, collection, getDocs, query, where } from "../firebase";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY || "" });

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

export interface SymptomAnalysis {
  possibleConditions: {
    condition: string;
    description: string;
    suggestedMedicines: string[];
    firstAid: string;
    alternativeTreatments: string;
    recommendedSpecialist: string;
  }[];
  advice: string;
  isEmergency: boolean;
}

export interface DoctorRecommendation {
  name: string;
  specialty: string;
  distance: string;
  phone: string;
  address: string;
  mapsUrl: string;
}

export interface SearchResult {
  info: MedicineInfo | null;
  suggestions?: string[];
}

export const searchMedicine = async (query: string, language: string = 'English'): Promise<SearchResult | null> => {
  const ai = getAI();
  try {
    // 1. Get text info and check for suggestions
    const textResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide essential medical information for the medicine: ${query}. 
      
      CRITICAL PRIORITIES:
      1. Name, Usage, and Dosage MUST be the most detailed and accurate sections.
      2. If the exact medicine name "${query}" is not found or is misspelled, you MUST provide exactly 3 alternative medicine name suggestions that are real, existing medications.
      
      Include for medicine info:
      - name: The official name (ESSENTIAL)
      - usage: Primary uses and indications (ESSENTIAL - be detailed)
      - dosage: Standard dosage instructions (ESSENTIAL - be clear)
      - sideEffects: Common and serious side effects (ESSENTIAL)
      - interactions: Drug and food interactions
      - precautions: General safety warnings
      - contraindications: Who should NOT take this medicine
      - storage: Proper storage conditions
      - pregnancySafety: Safety information for pregnancy and breastfeeding
      - activeIngredients: List of active components
      - manufacturerInfo: Common brand names and generic status
      - doctorAdvice: A warm, professional, and familiar doctor's advice and suggestions regarding this specific medicine.
      
      The response MUST be in ${language}.
      Format as JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            info: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                usage: { type: Type.STRING },
                dosage: { type: Type.STRING },
                sideEffects: { type: Type.STRING },
                interactions: { type: Type.STRING },
                precautions: { type: Type.STRING },
                contraindications: { type: Type.STRING },
                storage: { type: Type.STRING },
                pregnancySafety: { type: Type.STRING },
                activeIngredients: { type: Type.STRING },
                manufacturerInfo: { type: Type.STRING },
                doctorAdvice: { type: Type.STRING },
              },
              required: [
                "name", "usage", "dosage", "sideEffects", "interactions", 
                "precautions", "contraindications", "storage", 
                "pregnancySafety", "activeIngredients", "manufacturerInfo",
                "doctorAdvice"
              ],
            },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Suggestions for correct medicine names if the query was misspelled or not found."
            }
          },
        },
      },
    });

    const result = JSON.parse(textResponse.text);
    const info: MedicineInfo | null = result.info || null;
    const suggestions: string[] = result.suggestions || [];

    if (info) {
      // 2. Generate image
      try {
        const imageResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [
              {
                text: `A clear, professional studio photograph of a medicine bottle or packaging for ${info.name}. Clean white background, pharmaceutical style.`,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio: "1:1",
            },
          },
        });

        for (const part of imageResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            info.imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      } catch (imgError) {
        console.error("Error generating medicine image:", imgError);
        info.imageUrl = `https://picsum.photos/seed/${encodeURIComponent(info.name)}/400/400`;
      }
    }

    return { info, suggestions };
  } catch (error) {
    console.error("Error searching medicine:", error);
    return null;
  }
};

export const getHealthTip = async (language: string = 'English'): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a short, unique, and helpful daily health tip (max 150 characters). The tip MUST be in ${language}.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });
    return response.text || "Stay hydrated! Drinking enough water is essential for your overall health.";
  } catch (error) {
    console.error("Error getting health tip:", error);
    return "Stay hydrated! Drinking enough water is essential for your overall health.";
  }
};

export const analyzeSymptoms = async (symptoms: string, imageData?: string, language: string = 'English'): Promise<SymptomAnalysis | null> => {
  const ai = getAI();
  try {
    const promptText = symptoms.trim() 
      ? `Analyze the following symptoms and provide possible conditions (diagnosis). 
         For each condition, provide a short, easy-to-understand description of the disease and its common characteristics.
         Also provide:
         1. Solution (Medicine): Suggest over-the-counter medicines.
         2. Alternative Way: Provide immediate first aid solutions, home remedies, or lifestyle changes to solve that symptom.
         3. Recommended Specialist: Suggest the type of doctor or specialist the user should consult (e.g., General Physician, Dermatologist, Cardiologist, etc.).
         
         Determine if the symptoms are "serious" or "emergency" (e.g., chest pain, severe bleeding, difficulty breathing, etc.).
         Always include a strong advice to consult a professional doctor.
         The entire response MUST be in ${language}.
         Symptoms: ${symptoms}`
      : `Analyze the symptoms shown in this image and provide possible conditions (diagnosis). 
         For each condition, provide a short, easy-to-understand description of the disease and its common characteristics.
         Also provide:
         1. Solution (Medicine): Suggest over-the-counter medicines.
         2. Alternative Way: Provide immediate first aid solutions, home remedies, or lifestyle changes to solve that symptom.
         3. Recommended Specialist: Suggest the type of doctor or specialist the user should consult (e.g., General Physician, Dermatologist, Cardiologist, etc.).
         
         Determine if the symptoms are "serious" or "emergency" (e.g., chest pain, severe bleeding, difficulty breathing, etc.).
         Always include a strong advice to consult a professional doctor.
         The entire response MUST be in ${language}.`;

    const parts: any[] = [{ text: promptText }];

    if (imageData) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageData.split(",")[1],
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            possibleConditions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  condition: { type: Type.STRING },
                  description: { type: Type.STRING },
                  suggestedMedicines: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  firstAid: { type: Type.STRING, description: "Immediate first aid solutions or home remedies for this condition." },
                  alternativeTreatments: { type: Type.STRING, description: "Alternative ways to solve the symptoms, such as lifestyle changes or non-medicinal approaches." },
                  recommendedSpecialist: { type: Type.STRING, description: "The type of medical specialist recommended for this condition." },
                },
                required: ["condition", "description", "suggestedMedicines", "firstAid", "alternativeTreatments", "recommendedSpecialist"],
              },
            },
            advice: { type: Type.STRING },
            isEmergency: { 
              type: Type.BOOLEAN,
              description: "Set to true if symptoms indicate a potential medical emergency or serious condition requiring immediate attention."
            }
          },
          required: ["possibleConditions", "advice", "isEmergency"],
        },
      },
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error analyzing symptoms:", error);
    return null;
  }
};

export const findNearbyHospitals = async (lat: number, lng: number, language: string = 'English'): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find the nearest hospitals and emergency medical centers near my location (${lat}, ${lng}). 
      Provide their names, addresses, and if possible, a brief description of their services.
      The response MUST be in ${language}.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      },
    });
    
    // Extract URLs from grounding chunks if available
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let text = response.text || "";
    if (chunks) {
      const links = chunks
        .filter((c: any) => c.maps?.uri)
        .map((c: any) => `\n- [${c.maps.title}](${c.maps.uri})`)
        .join('');
      if (links) {
        text += "\n\n### Locations on Maps:" + links;
      }
    }
    return text;
  } catch (error) {
    console.error("Error finding hospitals:", error);
    return "Could not find nearby hospitals. Please search manually on Google Maps or dial emergency services.";
  }
};

export const findNearbyDoctors = async (specialistType: string, lat: number, lng: number, radius: number = 5, language: string = 'English'): Promise<DoctorRecommendation[]> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find the 3 nearest ${specialistType} doctors or clinics within ${radius}km of my location (${lat}, ${lng}). 
      Provide their names, specialty, approximate distance, phone number, and address.
      The response MUST be in ${language}.
      IMPORTANT: Return the data as a JSON array of objects with keys: name, specialty, distance, phone, address, mapsUrl.
      If a field is unknown, use "N/A".`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      },
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const doctors = JSON.parse(jsonMatch[0]);
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const mapsLinks = chunks
          .filter((c: any) => c.maps?.uri)
          .map((c: any) => ({ title: c.maps.title, uri: c.maps.uri }));
        
        return doctors.map((doc: any) => {
          const match = mapsLinks.find((link: any) => 
            doc.name.toLowerCase().includes(link.title.toLowerCase()) || 
            link.title.toLowerCase().includes(doc.name.toLowerCase())
          );
          return {
            ...doc,
            mapsUrl: match ? match.uri : (doc.mapsUrl !== "N/A" ? doc.mapsUrl : `https://www.google.com/maps/search/${encodeURIComponent(doc.name + " " + doc.address)}`)
          };
        });
      }
      return doctors;
    }
    return [];
  } catch (error) {
    console.error("Error finding nearby doctors:", error);
    return [];
  }
};

export const translateUI = async (texts: string[], targetLanguage: string): Promise<Record<string, string>> => {
  const ai = getAI();
  const langKey = targetLanguage.toLowerCase();
  if (langKey === 'english') {
    return texts.reduce((acc, text) => ({ ...acc, [text]: text }), {});
  }

  // Try to load from cache
  const cacheKey = `mediguide_ui_cache_${langKey}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      // Check if all requested texts are in cache
      const allPresent = texts.every(t => parsed[t]);
      if (allPresent) return parsed;
    } catch (e) {
      console.error("Cache parse error:", e);
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following UI strings into ${targetLanguage}. Return a JSON object where keys are the original English strings and values are the translations.
      Strings: ${JSON.stringify(texts)}`,
      config: {
        responseMimeType: "application/json",
      },
    });
    const result = JSON.parse(response.text);
    
    // Merge with existing cache if any
    let finalResult = result;
    if (cached) {
      try {
        finalResult = { ...JSON.parse(cached), ...result };
      } catch (e) {}
    }
    localStorage.setItem(cacheKey, JSON.stringify(finalResult));
    
    return finalResult;
  } catch (error) {
    console.error("Error translating UI:", error);
    return texts.reduce((acc, text) => ({ ...acc, [text]: text }), {});
  }
};

export const translateObject = async <T>(obj: T, targetLanguage: string): Promise<T> => {
  const ai = getAI();
  const langKey = targetLanguage.toLowerCase();
  if (langKey === 'english' || !obj) {
    return obj;
  }

  // For objects, we use a simpler cache based on the object's stringified content
  const objHash = JSON.stringify(obj);
  const cacheKey = `mediguide_obj_cache_${langKey}_${objHash.length}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.original === objHash) return parsed.translated;
    } catch (e) {}
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following JSON object into ${targetLanguage}. 
      Keep the JSON structure exactly the same. 
      Only translate the string values that are human-readable content. 
      Do not translate technical keys, IDs, or timestamps.
      
      Object: ${JSON.stringify(obj)}`,
      config: {
        responseMimeType: "application/json",
      },
    });
    const translated = JSON.parse(response.text);
    
    // Cache the result
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ original: objHash, translated }));
    } catch (e) {
      // If quota exceeded, clear some cache
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('mediguide_obj_cache_')) localStorage.removeItem(key);
        });
      }
    }
    
    return translated;
  } catch (error) {
    console.error("Error translating object:", error);
    return obj;
  }
};

export const generateHighResImage = async (medicineName: string, size: "1K" | "2K" | "4K" = "1K"): Promise<string | null> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          {
            text: `A clear, high-resolution, professional studio photograph of a medicine bottle or packaging for ${medicineName}. Clean white background, pharmaceutical style, ultra-detailed.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: size
        },
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating high-res image:", error);
    return null;
  }
};

export const chatWithDoctor = async (message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[], language: string = 'English', lat?: number, lng?: number): Promise<string> => {
  const ai = getAI();
  
  const searchDoctorsInDatabase: FunctionDeclaration = {
    name: "searchDoctorsInDatabase",
    description: "Search for doctors in the provided database by speciality",
    parameters: {
      type: Type.OBJECT,
      properties: {
        speciality: {
          type: Type.STRING,
          description: "The doctor speciality to search for (e.g., Cardiologist, Dentist)"
        }
      },
      required: ["speciality"]
    }
  };

  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: `You are Mediguide AI, a healthcare assistant that helps users find doctors quickly.
        
        When a user asks about symptoms, diseases, or doctor recommendations:
        1. Identify the required doctor speciality.
        2. Suggest relevant doctors from the provided database using the searchDoctorsInDatabase tool.
        3. If no doctors are found in the database, use the Google Maps tool as a secondary source.
        4. Display doctor details in a clean, structured format.
        
        Always include:
        - Doctor Name
        - Speciality
        - Sitting Time / Availability (if available, else N/A)
        - Days Available (if available, else N/A)
        - Hospital / Clinic Name
        - Phone Number (click to call format: [Number](tel:Number))
        
        Rules:
        - Keep answers short and user-friendly.
        - If multiple doctors are available, show top 3–5.
        - If no doctor is available, suggest nearest alternative speciality.
        - Do not give medical diagnosis—only guidance and doctor suggestions.
        - Be polite and helpful.
        - The entire response MUST be in ${language}.
        
        Format response like:
        
        👨‍⚕️ Doctor Recommendation:
        
        1. Dr. [Name]
           🩺 Speciality: [Speciality]
           🕒 Time: [Timing]
           📅 Days: [Days]
           📍 Location: [Hospital/Clinic]
           📞 Phone: [Number](tel:Number)
        
        End with:
        "Would you like to book an appointment or see more doctors?"`,
        tools: [
          { googleMaps: {} },
          { functionDeclarations: [searchDoctorsInDatabase] }
        ],
        toolConfig: {
          includeServerSideToolInvocations: true,
          retrievalConfig: lat && lng ? {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          } : undefined
        } as any
      },
      history: history,
    });

    let response = await chat.sendMessage({ message });
    
    // Handle function calls
    if (response.functionCalls) {
      const functionResponses = [];
      for (const call of response.functionCalls) {
        if (call.name === "searchDoctorsInDatabase") {
          const { speciality } = call.args as { speciality: string };
          try {
            const q = query(collection(db, 'doctors'), where('speciality', '==', speciality));
            const snapshot = await getDocs(q);
            const doctors = snapshot.docs.map(doc => doc.data());
            functionResponses.push({
              name: call.name,
              response: { doctors },
              id: call.id
            });
          } catch (error) {
            console.error("Error searching doctors in database:", error);
            functionResponses.push({
              name: call.name,
              response: { error: "Failed to search database", doctors: [] },
              id: call.id
            });
          }
        }
      }
      
      if (functionResponses.length > 0) {
        response = await chat.sendMessage({
          message: functionResponses.map(r => ({
            functionResponse: {
              name: r.name,
              response: r.response
            }
          })) as any
        });
      }
    }
    
    // Extract grounding URLs if any and append them
    let text = response.text || "I'm sorry, I couldn't process that. How can I help you today?";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      const links = chunks
        .filter((c: any) => c.maps?.uri)
        .map((c: any) => `\n- [${c.maps.title}](${c.maps.uri})`)
        .join('');
      if (links) {
        text += "\n\n### Maps Links:" + links;
      }
    }
    
    return text;
  } catch (error) {
    console.error("Error in doctor chat:", error);
    return "I'm having a little trouble connecting right now. Please try again in a moment.";
  }
};
