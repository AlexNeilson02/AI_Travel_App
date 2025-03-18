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
    const parsedEndDate = new Date(endDate);
    const expectedDays = [];

    for (let d = new Date(parsedStartDate); d <= parsedEndDate; d.setDate(d.getDate() + 1)) {
      expectedDays.push(d.toISOString().split("T")[0]); // Store dates in YYYY-MM-DD format
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

    // Ensure that the duration matches endDate - startDate
    const calculatedDuration = (parsedEndDate.getTime() - parsedStartDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
    if (calculatedDuration !== duration) {
      console.warn(`Mismatch: Duration (${duration} days) does not match computed trip length (${calculatedDuration} days).`);
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

          // Suggest alternative activities if weather is bad
          const outdoorActivities = day.activities.filter((activity: any) => 
            ["outdoor", "park", "garden", "walk", "hike"].some(keyword => 
              activity.name.toLowerCase().includes(keyword)
            )
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
          console.warn(`No weather data available for ${destination} on ${day.date}.`);
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
    throw new Error(`Failed to generate trip suggestions: ${error.message}.`);
  }
}
