import OpenAI from "openai";

let client = null;

function getClient() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return client;
}

const SYSTEM_PROMPT = `You are a friendly English speaking coach for a beginner Odia speaker.

Rules:
- Use very simple English
- Always correct mistakes gently
- Give short, clear explanations
- Provide Odia translation of explanations to help learning
- Encourage the user warmly
- Ask the next practice question

You MUST respond in this EXACT JSON format (no markdown, no code blocks):
{
  "corrected": "The corrected English sentence",
  "explanation": "Brief explanation of the mistake",
  "translation": "Odia translation of the explanation (not the corrected sentence)",
  "nextQuestion": "A new simple sentence for the user to try",
  "hadErrors": true
}

If the sentence is already correct, set hadErrors to false and still provide explanation translation + next question.
Keep explanations under 2 sentences. Be warm and encouraging like a friend.`;

export async function getAIResponse(userInput) {
  try {
    const completion = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userInput },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = completion.choices[0].message.content.trim();

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(content);
      return {
        corrected: parsed.corrected || userInput,
        explanation: parsed.explanation || "",
        translation: parsed.translation || "",
        nextQuestion: parsed.nextQuestion || "",
        hadErrors: parsed.hadErrors !== undefined ? parsed.hadErrors : true,
      };
    } catch {
      // If AI doesn't return valid JSON, wrap the plain text
      return {
        corrected: userInput,
        explanation: content,
        translation: "",
        nextQuestion: "",
        hadErrors: false,
      };
    }
  } catch (error) {
    console.error("OpenAI API error:", error.message);
    console.error("Error status:", error.status);
    console.error("Error details:", error);
    throw new Error(`OpenAI API Error: ${error.message}`);
  }
}

export function calculateScore(aiResponse) {
  if (!aiResponse.hadErrors) return 100;

  // Compare original vs corrected to estimate severity
  const corrected = aiResponse.corrected.toLowerCase();
  const explanation = aiResponse.explanation.toLowerCase();

  // Simple heuristic: longer explanations = more errors
  if (explanation.length > 100) return 50;
  return 80;
}
