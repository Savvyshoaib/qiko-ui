/**
 * Frontend types and constants
 */

// Wizard step data types
export interface WizardData {
  // Step 1: Profile
  fullName?: string;
  professionalTitle?: string;
  location?: string;
  headline?: string;
  
  // Step 2: Specialisation
  categories?: string[];
  yearsOfExperience?: number;
  typicalClients?: string;
  
  // Step 3: Tone & Communication
  tone?: string;
  additionalGuidance?: string;
  
  // Step 4: Background & Story
  professionalBackground?: string;
  credentials?: string;
  
  // Step 5: Key Achievements
  achievements?: string;
  
  // Step 6: Opinions & Frameworks
  commonMistakes?: string;
  frameworks?: string;
  
  // Step 7: Empathy & Boundaries
  stakeholderBalance?: string;
  boundaries?: string;
  
  // Step 8: Services & Use Cases
  commonTasks?: string;
  exampleQA?: string;
  
  // Step 9: Plan
  planType?: "foundational" | "premium";
  monthlyPrice?: number;
  
  // Industry vertical
  industry?: "travel_leisure" | "real_estate" | "financial_services" | "healthcare" | "legal" | "other";
  
  // Progress tracking
  currentStep?: number;
  wizardCompleted?: number;
}

// Generic specialisation categories for most industries
export const SPECIALIZATION_CATEGORIES = [
  "Software Development",
  "UX/UI & Product Design",
  "Content & Copywriting",
  "Marketing & Growth (SEO, SEM, Social)",
  "Sales & GTM",
  "Business & Strategy Consulting",
  "Financial Consulting & Accounting",
  "Procurement & Supply Chain",
  "Legal & Compliance",
  "Project Management",
  "Virtual Assistance & Support",
  "Data & AI",
  "Cybersecurity",
  "Cloud & DevOps",
  "HR & Recruitment",
  "Education & Training",
  "Architecture & Interior Design",
] as const;

// Travel & Leisure specific specialisation categories
export const TRAVEL_SPECIALIZATION_CATEGORIES = [
  "Golf Holidays & Golf Travel",
  "Luxury Resort Holidays",
  "Adventure & Expedition Travel",
  "Honeymoon & Romance Travel",
  "Cruise Holidays",
  "Ski & Winter Sports",
  "Safari & Wildlife",
  "Beach & Island Getaways",
  "City Breaks & Cultural Tours",
  "Family Holidays",
  "Wellness & Spa Retreats",
  "Culinary & Wine Tours",
  "Corporate & Group Travel",
  "Destination Weddings",
  "Yacht & Sailing Charters",
  "Eco & Sustainable Tourism",
] as const;

export const TONE_OPTIONS = [
  { value: "formal", label: "Formal" },
  { value: "conversational", label: "Conversational" },
  { value: "technical", label: "Technical" },
  { value: "coaching", label: "Coaching / Supportive" },
  { value: "direct", label: "Direct / No-nonsense" },
] as const;

export const PLAN_OPTIONS = [
  {
    value: "foundational",
    title: "Foundational Avatar",
    description: "Digital CV / LinkedIn-on-steroids chat profile.",
  },
  {
    value: "premium",
    title: "Premium Digital Worker",
    description: "Deep domain expert with workflows and voice.",
  },
] as const;

export type WorkerStatus = "training" | "ready" | "error";

export const INDUSTRY_OPTIONS = [
  {
    value: "travel_leisure",
    title: "Travel & Leisure",
    description: "Hotels, flights, golf, tours, and travel planning",
    active: true,
    features: ["Hotel booking via Amadeus", "Itinerary management", "Booking dashboard", "Auto-generated follow-ups"],
  },
  {
    value: "real_estate",
    title: "Real Estate",
    description: "Property listings, viewings, and client management",
    active: false,
    features: ["Property search", "Viewing scheduler", "Lead management"],
  },
  {
    value: "financial_services",
    title: "Financial Services",
    description: "Investment advice, portfolio management, and financial planning",
    active: false,
    features: ["Portfolio tracking", "Market data", "Compliance tools"],
  },
  {
    value: "healthcare",
    title: "Healthcare",
    description: "Patient communication, appointment scheduling, and health advice",
    active: false,
    features: ["Appointment booking", "Patient records", "Health tracking"],
  },
  {
    value: "legal",
    title: "Legal",
    description: "Legal consultations, document review, and case management",
    active: false,
    features: ["Case management", "Document review", "Client portal"],
  },
  {
    value: "other",
    title: "Other / General",
    description: "General purpose digital worker without industry-specific features",
    active: true,
    features: ["Chat interface", "Training data", "Custom integrations"],
  },
] as const;

export type Industry = typeof INDUSTRY_OPTIONS[number]["value"];
