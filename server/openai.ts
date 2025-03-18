import OpenAI from "openai";
import { getWeatherForecast } from "./weather";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

  const systemPrompt = `You are an expert travel planner. Create a detailed travel itinerary for ${numberOfPeople} person(s) to ${destination} from ${startDate} to ${endDate}. Budget: $${totalBudget} ($${budget} per person). Preferences: ${preferences.join(", ")}.

Your response must be a valid JSON object with this exact structure:
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
}

Important:
1. Each activity should have a specific time, location, and realistic cost
2. Include accommodation suggestions with real costs
3. Each day must have a proper date format (YYYY-MM-DD)
4. Activities should be geographically logical to minimize travel time
5. Consider the weather and time of day for outdoor activities
6. Stay within the total budget for the group`;

  try {
    console.log('Generating trip suggestions with OpenAI...');
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are an expert travel planner focused on creating detailed, realistic itineraries." },
        ...chatHistory,
        { role: "user", content: systemPrompt }
      ],
      temperature: 0.7
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
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

    // Format dates correctly
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

    // Process each day
    const formattedDays = await Promise.all(expectedDays.map(async (date) => {
      const existingDay = itinerary.days?.find((d: any) => d.date === date);
      // Get weather data for this day
      const weatherData = await getWeatherForecast(destination, new Date(date));
      console.log('Weather data for', date, ':', weatherData);

      if (existingDay) {
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
          weatherContext: weatherData || undefined
        };
      } else {
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
          weatherContext: weatherData || undefined
        };
      }
    }));

    // Sort days by date
    formattedDays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log('Formatted days with weather:', formattedDays);
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