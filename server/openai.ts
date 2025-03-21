import OpenAI from "openai";
import { getWeatherForecast } from "./weather";
import { format, addDays, parseISO } from 'date-fns';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Function to generate a follow-up question based on the current context
async function generateFollowUpQuestion(
  destination: string,
  preferences: string[],
  chatHistory: Array<{ role: "user" | "assistant" | "system"; content: string }> = []
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a travel advisor helping to plan a trip to ${destination}. 
          Ask a relevant follow-up question based on the conversation history and preferences.
          Focus on understanding the traveler's interests, must-see attractions, dining preferences, 
          or specific experiences they're looking for. Keep questions concise and focused.
          If they've mentioned specific interests, ask for more details about those.
          Known preferences: ${preferences.join(", ")}`
        },
        ...chatHistory,
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content || "What specific activities interest you the most?";
  } catch (error) {
    console.error("Error generating follow-up question:", error);
    return "What would you like to know more about for your trip?";
  }
}

// Function to generate trip suggestions
export async function generateTripSuggestions(
  destination: string,
  preferences: string[],
  budget: number,
  duration: number,
  startDate: string,
  endDate: string,
  numberOfPeople: number = 1,
  chatHistory: Array<{ role: "user" | "assistant" | "system"; content: string }> = []
): Promise<any> {
  const totalBudget = budget * numberOfPeople;

  const userInterests = chatHistory
    .filter(msg => msg.role === "user")
    .map(msg => msg.content)
    .join("\n");

  // Create a more explicit prompt that emphasizes the need for ALL days in the date range
  const systemPrompt = `You are an expert travel planner creating a personalized itinerary for ${numberOfPeople} person(s) to ${destination} from ${startDate} to ${endDate}. 
Budget: $${totalBudget} ($${budget} per person).
Known preferences: ${preferences.join(", ")}
Additional context from conversation:
${userInterests}

IMPORTANT: Your itinerary MUST include ALL ${duration} days from ${startDate} to ${endDate}. Create an entry for each day in the specified date range.

Your response must be structured as a JSON object. Return only the JSON object with this structure, no additional text:
{
  "days": [
    {
      "date": "MMM d, yyyy format",
      "dayOfWeek": "Full day name",
      "activities": {
        "timeSlots": [
          {
            "time": "HH:MM",
            "activity": "Activity name",
            "location": "Location name",
            "duration": "Duration in hours",
            "cost": number,
            "notes": "Additional details",
            "url": "Optional website URL",
            "isOutdoor": boolean
          }
        ]
      },
      "accommodation": {
        "name": "Hotel/Place name",
        "cost": number,
        "location": "Address"
      },
      "meals": {
        "budget": number
      }
    }
  ]
}`;

  try {
    console.log('Generating trip suggestions with OpenAI...');
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are an expert travel planner. Include both local currency and USD. Respond only with valid JSON objects." },
        { role: "user", content: `${systemPrompt}\nPlease provide costs in both local currency and USD.` }
      ],
      temperature: 0.7,
    });

    const content = aiResponse.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    let itinerary;
    try {
      itinerary = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.log('Raw response:', content);
      throw new Error('Failed to parse trip suggestions');
    }

    // Validate we got the expected number of days
    console.log(`Expected itinerary days: ${duration}, Received: ${itinerary.days?.length || 0}`);
    
    if (!itinerary.days || itinerary.days.length < duration) {
      console.warn(`OpenAI didn't return all ${duration} days. Received only ${itinerary.days?.length || 0} days.`);
      
      // If we have a start date but not enough days, let's make sure we have the complete range
      if (itinerary.days && itinerary.days.length > 0) {
        const firstDate = new Date(itinerary.days[0].date);
        const expectedDates = [];
        
        // Generate the expected range of dates
        for (let i = 0; i < duration; i++) {
          const currentDate = addDays(firstDate, i);
          expectedDates.push({
            date: format(currentDate, 'MMM d, yyyy'),
            dayOfWeek: format(currentDate, 'EEEE')
          });
        }
        
        // Check which dates are missing and fill in blanks
        const existingDates = itinerary.days.map((day: any) => day.date);
        const filledDays = [...itinerary.days];
        
        expectedDates.forEach(expectedDay => {
          if (!existingDates.includes(expectedDay.date)) {
            console.log(`Adding missing day: ${expectedDay.date}`);
            // Add a placeholder day
            filledDays.push({
              date: expectedDay.date,
              dayOfWeek: expectedDay.dayOfWeek,
              activities: {
                timeSlots: [
                  {
                    time: "09:00",
                    activity: "Free time",
                    location: destination,
                    duration: "Full day",
                    cost: 0,
                    notes: "This day was automatically added to complete your itinerary.",
                    isOutdoor: false
                  }
                ]
              },
              accommodation: filledDays.length > 0 ? filledDays[filledDays.length-1].accommodation : {
                name: "TBD",
                cost: 0,
                location: ""
              },
              meals: {
                budget: 50
              }
            });
          }
        });
        
        // Sort by date to ensure correct order
        filledDays.sort((a: any, b: any) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
        
        itinerary.days = filledDays;
      }
    }
    
    // Format days without any timezone manipulation
    const formattedDays = await Promise.all(itinerary.days.map(async (day: any, index: number) => {
      let weatherData = null;
      try {
        weatherData = await getWeatherForecast(destination, new Date(day.date));
        console.log('Weather data for', day.date, ':', weatherData);
      } catch (weatherError) {
        console.error(`Error getting weather for ${day.date}:`, weatherError);
        // Continue without weather data
      }

      return {
        date: day.date,
        dayOfWeek: day.dayOfWeek,
        activities: {
          timeSlots: (day.activities?.timeSlots || []).map((activity: any) => ({
            time: activity.time || "09:00",
            activity: activity.activity || "Free time",
            location: activity.location || "TBD",
            duration: activity.duration || "2 hours",
            cost: activity.cost || 0,
            notes: activity.notes || "",
            url: activity.url || "",
            isEdited: false,
            isOutdoor: activity.isOutdoor || false
          }))
        },
        accommodation: {
          name: day.accommodation?.name || "TBD",
          cost: day.accommodation?.cost || 0,
          totalCost: day.accommodation?.cost || 0,
          location: day.accommodation?.location || ""
        },
        meals: {
          budget: day.meals?.budget || 50,
          totalBudget: day.meals?.budget || 50
        },
        aiSuggestions: {
          reasoning: "Based on your preferences",
          weatherContext: weatherData ? {
            description: weatherData.description || "Weather data unavailable",
            temperature: weatherData.temperature || 0,
            precipitation_probability: weatherData.precipitation_probability || 0,
            is_suitable_for_outdoor: weatherData.is_suitable_for_outdoor || true
          } : undefined,
          alternativeActivities: []
        },
        isFinalized: false
      };
    }));

    console.log('Formatted days with weather:', formattedDays[0]);
    console.log('Number of days in itinerary:', formattedDays.length);
    
    // Create the result object with all days
    const result = {
      days: formattedDays,
      totalCost: itinerary.totalCost || 0,
      perPersonCost: itinerary.perPersonCost || 0,
      tips: itinerary.tips || [],
      personalizedSuggestions: itinerary.personalizedSuggestions || [],
    };
    
    console.log('Full itinerary days count:', result.days.length);
    return result;
  } catch (error: any) {
    console.error("Failed to generate trip suggestions:", error);
    throw new Error(`Failed to generate trip suggestions: ${error.message}`);
  }
}

export { generateFollowUpQuestion };