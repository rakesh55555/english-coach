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

// Question templates based on difficulty level with Odia translations
const QUESTION_TEMPLATES = {
  Beginner: [
    { en: "What is your name?", od: "ଆପଙ୍କ ନାମ କଣ?" },
    { en: "Where do you live?", od: "ଆପଣ କେଉଁଠାରେ ରୁହନ୍ତି?" },
    { en: "What do you do for work?", od: "ଆପଣ କାମ ପାଇଁ କଣ କରନ୍ତି?" },
    { en: "What is your hobby?", od: "ଆପଙ୍କ ଶୌଖ କଣ?" },
    { en: "How many siblings do you have?", od: "ଆପଙ୍କ କେତେ ଭାଇ ଓ ଭଉଣୀ ଅଛନ୍ତି?" },
  ],
  Basic: [
    { en: "Tell me about your favorite place to visit.", od: "ଆପଙ୍କ ପ୍ରିୟ ଯାତ୍ରା ସ୍ଥାନ ବିଷୟରେ କୁହୁଅ।" },
    { en: "What did you do yesterday?", od: "ଗତ କାଲି ଆପଣ କଣ କରିଲେ?" },
    { en: "Why did you choose to learn English?", od: "ଆପଣ ଇଂରାଜୀ ଶିଖିବାକୁ କାହିଁକି ବାଛିଲେ?" },
    { en: "Describe your daily routine.", od: "ଆପଙ୍କ ଦୈନନ୍ଦିନ ଦିନ ବିବରଣ କରନ୍ତୁ।" },
    { en: "What would you like to achieve in the next year?", od: "ଆଗାମୀ ବର୍ଷରେ ଆପଣ କଣ ହାସଲ କରିବେ ଚାହୁଁ?" },
  ],
  Intermediate: [
    { en: "How would you explain your job to someone who has never heard of it?", od: "ଯିଏ ଏହା ଶୁଣି ନାହାଁନ୍ତି ତାହାକୁ ଆପଣ ନିଜର ଚାକିରୀ କିପରି ବୁଝାଇବେ?" },
    { en: "What are the pros and cons of social media?", od: "ସୋସିଆଲ ମିଡିଆର ଗୁଣ ଓ ଦୋଷ କ'ଣ?" },
    { en: "If you could change one thing in the world, what would it be?", od: "ଯଦି ଆପଣ ବିଶ୍ବରେ ଏକ ଜିନିଷ ବଦଳାଇ ପାରିବେ, ତେବେ ତାହା କଣ ହେବ?" },
    { en: "How do you think technology will change in 10 years?", od: "ଆପଣ ଭାବନ୍ତି ୧୦ ବର୍ଷରେ ଟେକୋଲୋଜି କିପରି ବଦଳିବ?" },
    { en: "What advice would you give to someone learning English?", od: "ଆପଣ ଇଂରାଜୀ ଶିଖୁଥିବା ବ୍ୟକ୍ତିକୁ କଣ ପରାମର୍ଶ ଦେବେ?" },
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
  "followUp": "A natural follow-up question based on their answer (in English)",
  "followUpOdia": "Odia translation of the follow-up question (ଓଡ଼ିଆରେ)"
}

Keep explanations short and encouraging.
Include both English and Odia explanations.
Always provide followUp in English AND followUpOdia in Odia.
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
      
      // Get next question: prefer AI-generated, fallback to templates
      const nextQuestionText = parsed.followUp || null;
      const nextQuestionOdiaText = parsed.followUpOdia || null;
      
      let nextQuestion, nextQuestionOdia;
      
      if (nextQuestionText && nextQuestionOdiaText) {
        // Use AI-generated question with both translations
        nextQuestion = nextQuestionText;
        nextQuestionOdia = nextQuestionOdiaText;
      } else if (nextQuestionText) {
        // AI gave English but no Odia - use English for both as fallback
        nextQuestion = nextQuestionText;
        nextQuestionOdia = nextQuestionText;
      } else {
        // No AI-generated follow-up, use template
        const nextQuestionObj = generateQuestion(userLevel);
        nextQuestion = nextQuestionObj.en;
        nextQuestionOdia = nextQuestionObj.od;
      }
      
      return {
        feedback: parsed.feedback || "Good effort!",
        corrections: parsed.corrections,
        explanation: parsed.explanation,
        explanationOdia: parsed.explanationOdia || parsed.explanation,
        score: parsed.score || 75,
        nextQuestion,
        nextQuestionOdia,
      };
    } catch {
      // If JSON parsing fails, return structured response anyway
      const fallbackQuestionObj = generateQuestion(userLevel);
      return {
        feedback: content.substring(0, 100),
        corrections: null,
        explanation: content.substring(100, 200),
        explanationOdia: "",
        score: 75,
        nextQuestion: fallbackQuestionObj.en,
        nextQuestionOdia: fallbackQuestionObj.od,
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
  const questionObj = generateQuestion(userLevel);

  return {
    greeting,
    question: questionObj.en,
    questionOdia: questionObj.od,
  };
}
