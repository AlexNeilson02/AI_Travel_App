import OpenAI from "openai";
import { getWeatherForecast, suggestAlternativeActivities } from "./weather";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateTripSuggestions(
  destination: string,
  preferences: string[],
  budget: number,
  duration: number,
  startDate: string,
  numberOfPeople: number = 1,
  chatHistory: { role: string; content: string }[] = []
): Promise<any> {
  const totalBudget = budget * numberOfPeople;
  const systemPrompt = `Create a detailed travel itinerary for ${numberOfPeople} person(s) on a ${duration}-day trip to ${destination} starting on ${startDate} with the following preferences: ${preferences.join(", ")}. The total budget is $${totalBudget} (calculated as $${budget} per person). 

Important planning criteria:
1. Group activities by geographical proximity to minimize travel time
2. Schedule outdoor activities during optimal times of day
3. Consider logical flow between locations
4. Account for opening hours and peak times
5. Space activities appropriately throughout the day
6. The budget should cover activities and accommodations for ${numberOfPeople} person(s)

Please provide a day-by-day itinerary with activities, estimated costs (shown as per person), and suggested accommodations. Include URLs for each activity and accommodation when available. Format the response as a JSON object with the following structure:
  {
    "days": [
      {
        "day": number,
        "date": string (YYYY-MM-DD format),
        "dayOfWeek": string,
        "activities": [{ 
          "name": string, 
          "cost": number,
          "totalCost": number,
          "duration": string,
          "url": string,
          "location": string,
          "time": string (HH:MM format),
          "proximityGroup": string (area/neighborhood name)
        }],
        "accommodation": { 
          "name": string, 
          "cost": number,
          "totalCost": number,
          "url": string,
          "location": string
        },
        "meals": { 
          "budget": number,
          "totalBudget": number
        }
      }
    ],
    "totalCost": number,
    "perPersonCost": number,
    "tips": [string]
  }`;

  try {
    const messages = [
      { 
        role: "system" as const, 
        content: "You are an expert travel planner with extensive knowledge of destinations worldwide. Focus on creating geographically optimized itineraries that minimize travel time between activities. Always include time slots and location details for better planning. Always respond with valid JSON." 
      },
      ...chatHistory.map(msg => ({ role: msg.role as "user" | "assistant", content: msg.content })),
      { role: "user" as const, content: systemPrompt },
    ];

    console.log('Generating trip suggestions with OpenAI...');
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      temperature: 0.7
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.error('No content received from OpenAI. Check API key and network connectivity.');
      return null;
    }

    console.log('Parsing OpenAI response...');
    let itinerary;
    try {
      itinerary = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError, 'Raw response:', content);
      return null;
    }

    // Add weather data for each day
    console.log('Adding weather data to itinerary...');
    for (const day of itinerary.days) {
      try {
        console.log(`Fetching weather for ${destination} on ${day.date}`);
        const weather = await getWeatherForecast(destination, new Date(day.date));
        if (weather) {
          console.log(`Weather data received for ${day.date}:`, weather);
          day.weatherContext = weather;
          // If weather is not suitable for outdoor activities, suggest alternatives
          const outdoorActivities = day.activities.filter((activity: any) => 
            activity.name.toLowerCase().includes('outdoor') ||
            activity.name.toLowerCase().includes('park') ||
            activity.name.toLowerCase().includes('garden') ||
            activity.name.toLowerCase().includes('walk') ||
            activity.name.toLowerCase().includes('hike')
          );
          if (!weather.is_suitable_for_outdoor && outdoorActivities.length > 0) {
            const alternatives = [];
            for (const activity of outdoorActivities) {
              const activityAlternatives = suggestAlternativeActivities(weather, activity.name);
              alternatives.push(...activityAlternatives.map(alt => ({
                name: alt,
                proximityGroup: activity.proximityGroup,
                time: activity.time,
                duration: activity.duration,
                cost: activity.cost,
                totalCost: activity.cost * numberOfPeople
              })));
            }
            day.alternativeActivities = alternatives;
          } else {
            day.alternativeActivities = [];
          }
        } else {
          console.warn(`No weather data available for ${destination} on ${day.date}. Check weather API and location data.`);
          day.weatherContext = null;
          day.alternativeActivities = [];
        }
      } catch (error) {
        console.error(`Error fetching weather for ${destination} on ${day.date}:`, error);
        day.weatherContext = null;
        day.alternativeActivities = [];
      }
    }

    return itinerary;
  } catch (error: any) {
    console.error("Failed to generate trip suggestions:", error);
    throw new Error(`Failed to generate trip suggestions: ${error.message}. Check OpenAI API configuration and request parameters.`);
  }
}

export async function getTripRefinementQuestions(
  currentPreferences: string[]
): Promise<string> {
  const prompt = `You are a travel advisor starting a conversation with a traveler. Ignore the current preferences for now and ask an open-ended question to understand their overall expectations and travel style for this trip. Focus on what would make this trip special or meaningful to them. The question should be friendly, conversational, and encourage them to share their vision for the trip.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system" as const,
          content: "You are a friendly travel advisor helping to plan the perfect trip. Ask focused, specific questions one at a time.",
        },
        {
          role: "user" as const,
          content: prompt,
        },
      ],
    });

    return response.choices[0].message.content || "What would make this trip truly special for you? Tell me about your ideal experience.";
  } catch (error: any) {
    console.error("Failed to generate question:", error);
    throw new Error(`Failed to generate question: ${error.message}. Check OpenAI API configuration.`);
  }
}