import OpenAI from "openai";
import { getWeatherForecast, suggestAlternativeActivities } from "./weather";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateTripSuggestions(
  destination: string,
  preferences: string[],
  budget: number,
  duration: number,
  startDate: string,
  endDate: string,
  numberOfPeople: number = 1,
  chatHistory: { role: string; content: string }[] = []
): Promise<any> {
  const totalBudget = budget * numberOfPeople;

  // Updated system prompt with precise date range
  const systemPrompt = `Create a detailed travel itinerary for ${numberOfPeople} person(s) on a ${duration}-day trip to ${destination}, starting on ${startDate} and ending on ${endDate}, ensuring each day is accounted for. Preferences: ${preferences.join(", ")}. The total budget is $${totalBudget} (calculated as $${budget} per person). 

Important planning criteria:
1. Group activities by geographical proximity to minimize travel time.
2. Schedule outdoor activities during optimal times of day.
3. Consider logical flow between locations.
4. Account for opening hours and peak times.
5. Space activities appropriately throughout the day.
6. The budget should cover activities and accommodations for ${numberOfPeople} person(s).

Please provide a daily itinerary including activities, estimated costs (per person), accommodations, and meals. Each day should be correctly sequenced from ${startDate} to ${endDate}.

Format response as JSON:
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
        role: "system", 
        content: "You are an expert travel planner with extensive knowledge of destinations worldwide. Focus on creating geographically optimized itineraries that minimize travel time between activities. Always respond with valid JSON." 
      },
      ...chatHistory.map(msg => ({ role: msg.role as "user" | "assistant", content: msg.content })),
      { role: "user", content: systemPrompt },
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

    // Validate that the itinerary includes all days from startDate to endDate
    console.log('Validating itinerary dates...');
    const parsedStartDate = new Date(startDate);
    parsedStartDate.setUTCHours(0, 0, 0, 0);
    const parsedEndDate = new Date(endDate);
    parsedEndDate.setUTCHours(0, 0, 0, 0);
    const expectedDays = [];

    const currentDate = new Date(parsedStartDate);
    while (currentDate <= parsedEndDate) {
      expectedDays.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const aiGeneratedDates = itinerary.days.map((day: any) => day.date);
    const missingDates = expectedDays.filter(date => !aiGeneratedDates.includes(date));

    if (missingDates.length > 0) {
      console.warn(`Missing itinerary dates: ${missingDates.join(", ")}`);

      // Add missing dates with placeholders
      for (const date of missingDates) {
        itinerary.days.push({
          day: itinerary.days.length + 1,
          date: date,
          dayOfWeek: new Date(date).toLocaleDateString("en-US", { weekday: "long" }),
          activities: [],
          accommodation: null,
          meals: { budget: 0, totalBudget: 0 },
        });
      }

      // Sort itinerary by date
      itinerary.days.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return itinerary;
  } catch (error: any) {
    console.error("Failed to generate trip suggestions:", error);
    throw new Error(`Failed to generate trip suggestions: ${error.message}.`);
  }
}