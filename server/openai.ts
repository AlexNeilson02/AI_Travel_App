import OpenAI from "openai";
import { getWeatherForecast, suggestAlternativeActivities } from "./weather";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateTripSuggestions(
  destination: string,
  preferences: string[],
  budget: number,
  duration: number,
  startDate: string,
  chatHistory: { role: string; content: string }[] = []
): Promise<any> {
  const systemPrompt = `Create a detailed travel itinerary for a ${duration}-day trip to ${destination} with the following preferences: ${preferences.join(", ")}. The total budget is $${budget}. Please provide a day-by-day itinerary with activities, estimated costs, and suggested accommodations. Include URLs for each activity and accommodation. Format the response as a JSON object with the following structure:
  {
    "days": [
      {
        "day": number,
        "date": string,
        "dayOfWeek": string,
        "activities": [{ 
          "name": string, 
          "cost": number, 
          "duration": string,
          "url": string // URL to the activity's website or booking page
        }],
        "accommodation": { 
          "name": string, 
          "cost": number,
          "url": string // URL to the accommodation's website or booking page
        },
        "meals": { "budget": number }
      }
    ],
    "totalCost": number,
    "tips": [string]
  }`;

  try {
    const messages = [
      { role: "system" as const, content: "You are an expert travel planner with extensive knowledge of destinations worldwide. Always include official website URLs for activities and accommodations when available." },
      ...chatHistory.map(msg => ({ role: msg.role as "user" | "assistant", content: msg.content })),
      { role: "user" as const, content: systemPrompt },
    ];

    console.log('Generating trip suggestions with OpenAI...');
    const response = await openai.chat.completions.create({
      model: "gpt-4",  // Using the correct model name
      messages,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.log('No content received from OpenAI');
      return null;
    }

    console.log('Parsing OpenAI response...');
    const itinerary = JSON.parse(content);

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
          if (!weather.is_suitable_for_outdoor) {
            const outdoorActivities = day.activities.filter((activity: any) => 
              activity.name.toLowerCase().includes('outdoor') ||
              activity.name.toLowerCase().includes('park') ||
              activity.name.toLowerCase().includes('garden') ||
              activity.name.toLowerCase().includes('walk') ||
              activity.name.toLowerCase().includes('hike')
            );
            if (outdoorActivities.length > 0) {
              day.alternativeActivities = suggestAlternativeActivities(weather, outdoorActivities[0].name);
            }
          }
        } else {
          console.log(`No weather data available for ${destination} on ${day.date}`);
          day.weatherContext = null;
        }
      } catch (error) {
        console.error(`Error fetching weather for ${destination} on ${day.date}:`, error);
        day.weatherContext = null;
      }
    }

    return itinerary;
  } catch (error: any) {
    console.error("Failed to generate trip suggestions:", error);
    throw new Error("Failed to generate trip suggestions: " + error.message);
  }
}

export async function getTripRefinementQuestions(
  currentPreferences: string[]
): Promise<string> {
  const prompt = `You are a travel advisor starting a conversation with a traveler. Ignore the current preferences for now and ask an open-ended question to understand their overall expectations and travel style for this trip. Focus on what would make this trip special or meaningful to them. The question should be friendly, conversational, and encourage them to share their vision for the trip. For example, ask about their ideal experience, what they hope to get out of this trip, or what would make this trip perfect for them.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",  // Using the correct model name
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
    throw new Error("Failed to generate question: " + error.message);
  }
}