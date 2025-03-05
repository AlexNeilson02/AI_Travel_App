import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateTripSuggestions(
  destination: string,
  preferences: string[],
  budget: number,
  duration: number
): Promise<any> {
  const prompt = `Create a detailed travel itinerary for a ${duration}-day trip to ${destination} with the following preferences: ${preferences.join(", ")}. The total budget is $${budget}. Please provide a day-by-day itinerary with activities, estimated costs, and suggested accommodations. Format the response as a JSON object with the following structure:
  {
    "days": [
      {
        "day": number,
        "activities": [{ "name": string, "cost": number, "duration": string }],
        "accommodation": { "name": string, "cost": number },
        "meals": { "budget": number }
      }
    ],
    "totalCost": number,
    "suggestedAccommodations": [string],
    "tips": [string]
  }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert travel planner with extensive knowledge of destinations worldwide.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    throw new Error("Failed to generate trip suggestions: " + error.message);
  }
}
