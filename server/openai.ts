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

  // Create a more explicit prompt that emphasizes the need for ALL days in the date range and realistic pricing
  const systemPrompt = `You are an expert travel planner creating a personalized itinerary for ${numberOfPeople} person(s) to ${destination} from ${startDate} to ${endDate}. 
Budget: $${totalBudget} ($${budget} per person).
Known preferences: ${preferences.join(", ")}
Additional context from conversation:
${userInterests}

IMPORTANT:
1. Your itinerary MUST include ALL ${duration} days from ${startDate} to ${endDate}. Create an entry for each day in the specified date range.
2. Always use REALISTIC pricing for accommodations, activities, and meals. Never use unrealistically low prices.
3. For accommodations (hotels/motels/hostels), the minimum cost should be $50-70 per night for budget options, $100-150 for mid-range, and $200+ for luxury.
4. ACCOMMODATION MUST BE A PLACE TO STAY (hotel, motel, hostel, inn, Airbnb, etc.) NOT a restaurant, attraction, or activity.
5. If the user's budget is very low, prioritize budget accommodations, free activities, and affordable meals.
6. If you cannot stay within budget with realistic prices, get as close as possible and note this in the tips section.
7. Each day should have a proper accommodation listing where the traveler will stay overnight.

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
            "cost": {
              "USD": number,
              "local": number
            },
            "notes": "Additional details",
            "url": "Optional website URL",
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
        "location": "Address"
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
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "You are an expert travel planner. Include both local currency and USD. Respond only with valid JSON objects. Always ensure accommodations are actual places to stay (hotels, motels, hostels, inns, Airbnb) and never restaurants, attractions, or other non-accommodation venues." 
        },
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
          location: day.accommodation?.location || ""
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