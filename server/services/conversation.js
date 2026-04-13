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

// Question templates based on difficulty level
const QUESTION_TEMPLATES = {
  Beginner: [
    "What is your name?",
    "Where do you live?",
    "What do you do for work?",
    "What is your hobby?",
    "How many siblings do you have?",
  ],
  Basic: [
    "Tell me about your favorite place to visit.",
    "What did you do yesterday?",
    "Why did you choose to learn English?",
    "Describe your daily routine.",
    "What would you like to achieve in the next year?",
  ],
  Intermediate: [
    "How would you explain your job to someone who has never heard of it?",
    "What are the pros and cons of social media?",
    "If you could change one thing in the world, what would it be?",
    "How do you think technology will change in 10 years?",
    "What advice would you give to someone learning English?",
  ],
};

const SYSTEM_PROMPT_CONVERSATION = `You are a friendly English teacher having a conversation with a beginner Odia speaker learning English.

Your role:
1. Ask them questions to help them practice speaking
2. Evaluate their answer for grammar and clarity
3. Provide encouraging feedback in JSON format
4. Ask a follow-up question to continue the conversation

IMPORTANT: Respond in this EXACT JSON format (no markdown, no code blocks):
{
  "feedback": "Brief positive feedback about their answer",
  "corrections": "Grammar/spelling corrections if needed, or null if perfect",
  "explanation": "Brief explanation of any mistakes",
  "explanationOdia": "Same explanation but written in Odia script (ଓଡ଼ିଆ)",
  "score": 80,
  "followUp": "A natural follow-up question based on their answer"
}

Keep explanations short and encouraging.
Include both English and Odia explanations.
Score from 0-100 (0-40: Beginner, 40-70: Basic, 70-100: Intermediate)`;

/**
 * Generate a question based on user's level
 */
export function generateQuestion(userLevel = "Beginner") {
  const questions = QUESTION_TEMPLATES[userLevel] || QUESTION_TEMPLATES.Beginner;
  return questions[Math.floor(Math.random() * questions.length)];
}

/**
 * Evaluate user's answer and generate follow-up
 */
export async function evaluateConversationAnswer(
  userAnswer,
  previousQuestion,
  userLevel = "Beginner"
) {
  try {
    const systemPrompt = SYSTEM_PROMPT_CONVERSATION.replace(
      "beginner",
      userLevel === "Beginner"
        ? "beginner"
        : userLevel === "Basic"
          ? "intermediate beginner"
          : "advanced beginner"
    );

    const completion = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Question: "${previousQuestion}"\n\nTheir answer: "${userAnswer}"`,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const content = completion.choices[0].message.content.trim();

    try {
      const parsed = JSON.parse(content);
      return {
        feedback: parsed.feedback || "Good effort!",
        corrections: parsed.corrections,
        explanation: parsed.explanation,
        explanationOdia: parsed.explanationOdia || parsed.explanation,
        score: parsed.score || 75,
        followUp: parsed.followUp || generateQuestion(userLevel),
      };
    } catch {
      // If JSON parsing fails, return structured response anyway
      return {
        feedback: content.substring(0, 100),
        corrections: null,
        explanation: content.substring(100, 200),
        explanationOdia: "",
        score: 75,
        followUp: generateQuestion(userLevel),
      };
    }
  } catch (error) {
    console.error("Conversation evaluation error:", error.message);
    throw new Error("Failed to evaluate answer");
  }
}

/**
 * Get initial greeting based on user info
 */
export async function getGreeting(userName, userLevel) {
  const greeting = `Hi Bubu! Let's learn English together! 🌟`;
  const question = generateQuestion(userLevel);

  return {
    greeting,
    question,
  };
}
