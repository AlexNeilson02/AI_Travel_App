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
  chatHistory: { role: "user" | "assistant" | "system"; content: string }[] = []
): Promise<any> {
  const totalBudget = budget * numberOfPeople;

  const systemPrompt = `Create a detailed travel itinerary for ${numberOfPeople} person(s) to ${destination} from ${startDate} to ${endDate}. Budget: $${totalBudget} ($${budget} per person). Preferences: ${preferences.join(", ")}.

Important: Format all responses as properly escaped JSON strings. Each response must be valid JSON that can be parsed.

Required JSON structure:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "dayOfWeek": "Day name",
      "activities": {
        "timeSlots": [
          {
            "time": "HH:MM",
            "activity": "Activity name",
            "location": "Location name",
            "duration": "Duration in hours",
            "cost": number,
            "notes": "Additional details",
            "url": "Optional website URL"
          }
        ]
      },
      "accommodation": {
        "name": "Hotel/Place name",
        "cost": number,
        "location": "Address",
        "url": "Booking URL"
      },
      "meals": {
        "budget": number
      }
    }
  ],
  "totalCost": number,
  "perPersonCost": number,
  "tips": ["Tip 1", "Tip 2"]
}`;

  try {
    const messages = [
      { 
        role: "system", 
        content: "You are an expert travel planner. Always respond with valid, properly formatted JSON." 
      },
      ...chatHistory,
      { role: "user", content: systemPrompt }
    ];

    console.log('Generating trip suggestions with OpenAI...');
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      temperature: 0.7,
      response_format: { type: "json_object" } // Enforce JSON response
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.error('No content received from OpenAI');
      throw new Error('Failed to generate trip suggestions: No content received');
    }

    console.log('Parsing OpenAI response...');
    let itinerary;
    try {
      itinerary = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.log('Raw response:', content);
      throw new Error('Failed to parse trip suggestions');
    }

    // Validate and format the response
    const parsedStartDate = new Date(startDate);
    parsedStartDate.setUTCHours(0, 0, 0, 0);
    const parsedEndDate = new Date(endDate);
    parsedEndDate.setUTCHours(0, 0, 0, 0);

    // Generate all expected dates
    const expectedDays = [];
    const currentDate = new Date(parsedStartDate);
    while (currentDate <= parsedEndDate) {
      expectedDays.push(currentDate.toISOString().split('T')[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Ensure all days are present and properly formatted
    const formattedDays = await Promise.all(expectedDays.map(async (date) => {
      const existingDay = itinerary.days?.find((d: any) => d.date === date);
      const weatherData = await getWeatherForecast(destination, new Date(date));

      if (existingDay) {
        // Format existing day data
        return {
          date,
          dayOfWeek: new Date(date).toLocaleDateString("en-US", { weekday: "long" }),
          activities: {
            timeSlots: (existingDay.activities?.timeSlots || []).map((activity: any) => ({
              time: activity.time || "09:00",
              activity: activity.activity || activity.name || "Free time",
              location: activity.location || "TBD",
              duration: activity.duration || "2 hours",
              cost: activity.cost || 0,
              notes: activity.notes || "",
              url: activity.url || null,
              isEdited: false
            }))
          },
          accommodation: {
            name: existingDay.accommodation?.name || "TBD",
            cost: existingDay.accommodation?.cost || 0,
            location: existingDay.accommodation?.location || "",
            url: existingDay.accommodation?.url || null
          },
          meals: {
            budget: existingDay.meals?.budget || 50
          },
          aiSuggestions: {
            reasoning: existingDay.reasoning || "",
            weatherContext: weatherData ? {
              description: weatherData.description,
              temperature: weatherData.temperature,
              precipitation_probability: weatherData.precipitation_probability,
              is_suitable_for_outdoor: weatherData.is_suitable_for_outdoor
            } : undefined,
            alternativeActivities: []
          },
          isFinalized: false
        };
      } else {
        // Create placeholder day
        return {
          date,
          dayOfWeek: new Date(date).toLocaleDateString("en-US", { weekday: "long" }),
          activities: {
            timeSlots: []
          },
          accommodation: {
            name: "TBD",
            cost: 0,
            location: "",
            url: null
          },
          meals: {
            budget: 50
          },
          aiSuggestions: {
            reasoning: "",
            weatherContext: weatherData ? {
              description: weatherData.description,
              temperature: weatherData.temperature,
              precipitation_probability: weatherData.precipitation_probability,
              is_suitable_for_outdoor: weatherData.is_suitable_for_outdoor
            } : undefined,
            alternativeActivities: []
          },
          isFinalized: false
        };
      }
    }));

    // Sort days by date
    formattedDays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      days: formattedDays,
      totalCost: itinerary.totalCost || 0,
      perPersonCost: itinerary.perPersonCost || 0,
      tips: itinerary.tips || []
    };
  } catch (error: any) {
    console.error("Failed to generate trip suggestions:", error);
    throw new Error(`Failed to generate trip suggestions: ${error.message}`);
  }
}