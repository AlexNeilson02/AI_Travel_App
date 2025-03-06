import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateTripSuggestions(
  destination: string,
  preferences: string[],
  budget: number,
  duration: number,
  chatHistory: { role: string; content: string }[] = []
): Promise<any> {
  const systemPrompt = `Create a detailed travel itinerary for a ${duration}-day trip to ${destination} with the following preferences: ${preferences.join(", ")}. The total budget is $${budget}. Please provide a day-by-day itinerary with activities, estimated costs, and suggested accommodations. Format the response as a JSON object with the following structure:
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
    const messages = [
      {
        role: "system",
        content: "You are an expert travel planner with extensive knowledge of destinations worldwide.",
      },
      ...chatHistory,
      {
        role: "user",
        content: systemPrompt,
      },
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    return content ? JSON.parse(content) : null;
  } catch (error: any) {
    throw new Error("Failed to generate trip suggestions: " + error.message);
  }
}

export async function getTripRefinementQuestions(
  currentPreferences: string[]
): Promise<string> {
  const prompt = `Based on these preferences: ${currentPreferences.join(", ")}, ask a follow-up question to better understand the traveler's preferences. Focus on one of these aspects: activity level, accommodation preferences, dining preferences, or budget allocation. Make the question conversational and specific.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a friendly travel advisor helping to plan the perfect trip. Ask focused, specific questions one at a time.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return response.choices[0].message.content || "What type of activities do you prefer during your travels?";
  } catch (error: any) {
    throw new Error("Failed to generate question: " + error.message);
  }
}