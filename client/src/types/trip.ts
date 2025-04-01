export interface TimeSlot {
  time: string;
  activity: string;
  location: string;
  duration: string;
  notes: string;
  isEdited: boolean;
  url?: string;
}

export interface TripDay {
  date: string;
  dayOfWeek?: string;
  activities: {
    timeSlots: TimeSlot[];
  };
  aiSuggestions?: {
    reasoning: string;
    weatherContext?: {
      description: string;
      temperature: number;
      humidity?: number;
      wind_speed?: number;
      precipitation_probability: number;
      is_suitable_for_outdoor: boolean;
      warning?: string;
    };
    alternativeActivities: string[];
  };
  userFeedback?: string;
  isFinalized: boolean;
}