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
      model: "gpt-4o",
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
  // Budget is now the total for the trip
  const budgetPerPerson = budget / numberOfPeople;

  const userInterests = chatHistory
    .filter(msg => msg.role === "user")
    .map(msg => msg.content)
    .join("\n");

  // Create a more explicit prompt that emphasizes the need for ALL days in the date range, URLs for activities, and realistic pricing
  const systemPrompt = `
You are JUNO, an efficient and practical AI travel planner.

Create a clear, realistic itinerary for ${numberOfPeople} person(s) traveling to ${destination} from ${startDate} to ${endDate}.
Total trip budget: $${budget} ($${budgetPerPerson.toFixed(2)} per person).
Preferences: ${preferences.join(", ")}
Additional user context:
${userInterests}

Requirements:
1. Include a full-day itinerary for each day of the trip. Be realistic with time and flow.
2. Include specific recommendations with:
   - Estimated cost
   - Duration
   - Address or website link
3. Use real, accessible locations (e.g., Google Maps links, attraction websites).
4. Respect the total budget—avoid luxury recommendations unless specifically requested.
5. Prioritize value, uniqueness, and local experiences.
6. Write with clarity and minimal fluff. No sales pitch. No filler. Be direct.

Example format:
10:00 — Breakfast at [Place Name] (~$10)  
11:30 — Visit [Attraction Name] (~$25) [website link]  
...and so on.

Your goal is to make this trip easy, exciting, and budget-aligned.
`;

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
            "location": "Location name with specific address",
            "duration": "Duration in hours",
            "cost": {
              "USD": number,
              "local": number
            },
            "notes": "Detailed description with useful tips",
            "url": "REAL AND WORKING WEBSITE URL (REQUIRED)",
            "isOutdoor": boolean
          }
        ]
      },
      "accommodation": {
        "name": "Hotel/Place name",
        "cost": {
          "USD": number,
          "local": number
        },
        "location": "Specific address",
        "url": "Hotel website URL (if available)"
      },
      "meals": {
        "budget": {
          "USD": number,
          "local": number
        }
      }
    }
  ],
  "totalCost": number,
  "perPersonCost": number,
  "tips": ["Important note 1", "Important note 2"],
  "personalizedSuggestions": ["Suggestion 1", "Suggestion 2"]
}`;

  try {
    console.log('Generating trip suggestions with OpenAI...');
    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are an expert travel planner who creates extremely detailed, complete itineraries with links to real attractions and activities. Include both local currency and USD. Respond only with valid JSON objects. Always ensure accommodations are actual places to stay (hotels, motels, hostels, inns, Airbnb) and never restaurants, attractions, or other non-accommodation venues. EVERY activity must include a real, working URL. Each day should have 5-8 different activities throughout the day."
        },
        { role: "user", content: `${systemPrompt}\nPlease provide costs in both local currency and USD. Remember to include REAL AND WORKING URLs for EVERY activity - this is critically important!` }
      ],
      max_completion_tokens: 4000,
    });

    const content = aiResponse.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    let itinerary;
    try {
      // First, try to parse it directly
      try {
        itinerary = JSON.parse(content);
      } catch (initialParseError) {
        // If direct parsing fails, try to extract JSON from the content
        console.log('Initial parsing failed, attempting to extract JSON from content');
        
        // Look for content between curly braces
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            itinerary = JSON.parse(jsonMatch[0]);
            console.log('Successfully extracted and parsed JSON from content');
          } catch (extractionError) {
            console.error('Failed to parse extracted JSON:', extractionError);
            throw new Error('Failed to parse extracted JSON content');
          }
        } else {
          console.error('No JSON object found in the response');
          throw new Error('No valid JSON found in the response');
        }
      }
      
      // Verify we have the minimum required structure
      if (!itinerary.days || !Array.isArray(itinerary.days) || itinerary.days.length === 0) {
        console.error('Invalid itinerary structure:', itinerary);
        throw new Error('Invalid itinerary structure: missing days array');
      }
      
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.log('Raw response:', content);
      
      // Create a simple default itinerary as fallback
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      let fallbackDays = [];
      
      for (let i = 0; i < duration; i++) {
        const currentDate = new Date(startDateObj);
        currentDate.setDate(startDateObj.getDate() + i);
        
        fallbackDays.push({
          date: format(currentDate, 'MMM d, yyyy'),
          dayOfWeek: format(currentDate, 'EEEE'),
          activities: {
            timeSlots: [
              {
                time: "09:00",
                activity: `Day ${i+1} in ${destination}`,
                location: destination,
                duration: "All day",
                cost: { USD: 0, local: 0 },
                notes: "This is a placeholder itinerary. Please try again with different search terms.",
                isOutdoor: false
              }
            ]
          },
          accommodation: {
            name: "Accommodation TBD",
            cost: { USD: 100, local: 100 },
            location: destination
          },
          meals: {
            budget: { USD: 50, local: 50 }
          }
        });
      }
      
      itinerary = {
        days: fallbackDays,
        totalCost: budget,
        perPersonCost: budget / numberOfPeople,
        tips: ["This is a placeholder itinerary due to generation errors", "Try again with more specific details"],
        personalizedSuggestions: ["Consider searching for a different destination or date range"]
      };
      
      console.log('Using fallback itinerary structure due to parsing error');
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
                    cost: {
                      USD: 0,
                      local: 0
                    },
                    notes: "This day was automatically added to complete your itinerary.",
                    isOutdoor: false
                  }
                ]
              },
              accommodation: filledDays.length > 0 ? filledDays[filledDays.length-1].accommodation : {
                name: "TBD",
                cost: {
                  USD: 0,
                  local: 0
                },
                location: ""
              },
              meals: {
                budget: {
                  USD: 30,
                  local: 30
                }
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
    
    // Helper function to validate that accommodations are appropriate lodging venues
    const validateAccommodation = (name: string): boolean => {
      // List of common restaurant/dining words
      const restaurantKeywords = [
        'restaurant', 'cafe', 'grill', 'bistro', 'diner', 'eatery', 
        'bar', 'pub', 'tavern', 'kitchen', 'steakhouse', 'pizzeria',
        'coffeehouse', 'bakery', 'roadhouse', 'chophouse', 'cantina'
      ];
      
      // Attraction/activity words
      const attractionKeywords = [
        'museum', 'park', 'garden', 'tour', 'theater', 'cinema',
        'gallery', 'attraction', 'zoo', 'aquarium', 'stadium'
      ];
      
      // Check name against these keywords
      const lowerName = name.toLowerCase();
      
      const isRestaurant = restaurantKeywords.some(keyword => lowerName.includes(keyword));
      const isAttraction = attractionKeywords.some(keyword => lowerName.includes(keyword));
      
      // Validate accommodation (return false if it's a restaurant or attraction)
      return !(isRestaurant || isAttraction);
    };
    
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
      
      // Check if the accommodation is valid, if not, replace with a generic hotel
      const accommodationName = day.accommodation?.name || "TBD";
      const isValidAccommodation = validateAccommodation(accommodationName);
      
      if (!isValidAccommodation) {
        console.warn(`Invalid accommodation detected: "${accommodationName}". Replacing with generic hotel.`);
        day.accommodation = {
          name: "Budget Hotel",
          cost: typeof day.accommodation?.cost === 'object' 
            ? day.accommodation?.cost 
            : { USD: 60, local: 60 },
          location: day.accommodation?.location || `${destination}`
        };
      }

      return {
        date: day.date,
        dayOfWeek: day.dayOfWeek,
        activities: {
          timeSlots: (day.activities?.timeSlots || []).map((activity: any) => {
            // Handle both object-style costs and number-style costs from OpenAI
            const costObj = typeof activity.cost === 'object' 
              ? activity.cost 
              : { USD: typeof activity.cost === 'number' ? activity.cost : 0, local: typeof activity.cost === 'number' ? activity.cost : 0 };
              
            return {
              time: activity.time || "09:00",
              activity: activity.activity || "Free time",
              location: activity.location || "TBD",
              duration: activity.duration || "2 hours",
              cost: costObj,
              notes: activity.notes || "",
              url: activity.url || "",
              isEdited: false,
              isOutdoor: activity.isOutdoor || false
            };
          })
        },
        accommodation: {
          name: day.accommodation?.name || "TBD",
          cost: typeof day.accommodation?.cost === 'object' 
            ? day.accommodation?.cost 
            : { USD: typeof day.accommodation?.cost === 'number' ? day.accommodation?.cost : 0, local: typeof day.accommodation?.cost === 'number' ? day.accommodation?.cost : 0 },
          totalCost: typeof day.accommodation?.cost === 'object' 
            ? day.accommodation?.cost 
            : { USD: typeof day.accommodation?.cost === 'number' ? day.accommodation?.cost : 0, local: typeof day.accommodation?.cost === 'number' ? day.accommodation?.cost : 0 },
          location: day.accommodation?.location || "",
          url: day.accommodation?.url || ""
        },
        meals: {
          budget: typeof day.meals?.budget === 'object' 
            ? day.meals?.budget 
            : { USD: typeof day.meals?.budget === 'number' ? day.meals?.budget : 30, local: typeof day.meals?.budget === 'number' ? day.meals?.budget : 30 },
          totalBudget: typeof day.meals?.budget === 'object' 
            ? day.meals?.budget 
            : { USD: typeof day.meals?.budget === 'number' ? day.meals?.budget : 30, local: typeof day.meals?.budget === 'number' ? day.meals?.budget : 30 },
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
