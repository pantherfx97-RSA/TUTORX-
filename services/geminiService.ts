
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { LessonContent, DifficultyLevel, SubscriptionTier, UserProfile } from "../types.ts";
import { MODEL_NAME } from "../constants.ts";

const getAIClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("AI_ENGINE_OFFLINE: No valid API Key detected.");
  }
  return new GoogleGenAI({ apiKey });
};

const SYSTEM_PROMPT = `You are TutorX, an AI-powered educational tutor designed to help students understand concepts clearly and step by step.
TutorX was architected and built by Wally Nthani, a South African innovator, with the goal of making high-quality learning accessible, ethical, and precise.

Behavior rules:
- Teach concepts clearly and patiently.
- Prefer understanding over memorization.
- Adapt explanations to the learner’s level.
- Encourage critical thinking and confidence.
- Never shame, discourage, or rush the student.
- Ask clarifying questions when needed.

Founder acknowledgement rules:
- Acknowledge Wally Nthani as the creator only when relevant.
- Do NOT repeat the founder’s name in normal tutoring answers.

Academic integrity:
- Do not encourage cheating.
- Explain concepts rather than copying full exam answers.`;

const getOptimalModel = (tier: SubscriptionTier) => {
  return tier === SubscriptionTier.PRO ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
};

const getMemoryContext = (user?: UserProfile) => {
  if (!user) return "";
  return `
[LEARNING MEMORY]
- Academic Level: ${user.preferredLevel}
- Target Exam: ${user.examType || 'General Academic'}
- Completed Topics: ${user.completedTopics.join(', ') || 'None yet'}
- Weak Areas: ${user.weakTopics.join(', ') || 'None identified'}
`;
};

export const generateLesson = async (topic: string, level: DifficultyLevel, user?: UserProfile): Promise<LessonContent> => {
  const ai = getAIClient();
  const tier = user?.tier || SubscriptionTier.FREE;
  const model = getOptimalModel(tier);

  const isExamReady = level === DifficultyLevel.ADVANCED;

  const prompt = `${SYSTEM_PROMPT}
  
${getMemoryContext(user)}

Current Task: Deliver a personalized Masterclass on: "${topic}".
Current Depth Requirement: ${level}

The "summary" array must be extremely concise and actionable:
- Provide exactly 5-7 short key takeaways.
- Use strong action verbs (e.g., "Analyze", "Calculate", "Identify").
- Focus exclusively on "High-Yield" information critical for review.
- Avoid any filler text or long introductory phrases.

${isExamReady ? `This is an "Exam-Ready" Masterclass. Please include mark allocation suggestions, common mistakes, time-saving shortcuts, alternative methods, and examiner mindset tips in the exam_metadata object.` : ''}

Format: Strict RAW JSON only matching the schema.`;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: tier === SubscriptionTier.PRO ? 2048 : 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topic: { type: Type.STRING },
            lesson: { type: Type.STRING },
            summary: { type: Type.ARRAY, items: { type: Type.STRING } },
            quiz: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correct_answer: { type: Type.STRING }
                },
                required: ["question", "options", "correct_answer"]
              }
            },
            next_topics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  difficulty: { type: Type.STRING }
                }
              }
            },
            exam_metadata: {
              type: Type.OBJECT,
              properties: {
                mark_allocation: { type: Type.STRING },
                common_mistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
                time_saving_shortcuts: { type: Type.ARRAY, items: { type: Type.STRING } },
                alternative_methods: { type: Type.ARRAY, items: { type: Type.STRING } },
                examiner_mindset_tips: { type: Type.STRING }
              }
            }
          },
          required: ["topic", "lesson", "summary", "quiz", "next_topics"]
        }
      }
    });

    if (!response || !response.text) throw new Error("Empty AI response.");
    return JSON.parse(response.text.trim()) as LessonContent;
  } catch (error: any) {
    console.error("TutorX Curation Error:", error);
    throw new Error(`Curation Protocol Failed: ${error.message}`);
  }
};

export const analyzeDocument = async (fileBase64: string, mimeType: string, user?: UserProfile): Promise<string> => {
  const ai = getAIClient();
  const model = getOptimalModel(user?.tier || SubscriptionTier.PREMIUM);
  
  const filePart = {
    inlineData: {
      data: fileBase64,
      mimeType: mimeType,
    },
  };
  
  const textPart = {
    text: `You are the TutorX Document Analyzer. 
    Analyze the attached document and provide a highly structured, actionable breakdown. 
    Include:
    1. Executive Summary (3-4 sentences).
    2. Key Concepts & Definitions.
    3. Potential Exam Questions derived from the content.
    4. Practical Applications.
    Keep the tone professional and academic. Use Markdown for formatting.`
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [filePart, textPart] },
      config: {
        temperature: 0.4,
        systemInstruction: SYSTEM_PROMPT + getMemoryContext(user)
      }
    });
    return response.text || "Analysis synchronization failed.";
  } catch (error: any) {
    console.error("Document Analysis Error:", error);
    throw new Error(`Neural Analysis Failed: ${error.message}`);
  }
};

export const askTutor = async (question: string, context: LessonContent, history: {role: 'user' | 'model', text: string}[], user?: UserProfile): Promise<string> => {
  const ai = getAIClient();
  const tier = user?.tier || SubscriptionTier.FREE;
  const model = getOptimalModel(tier);
  
  try {
    const chat = ai.chats.create({
      model: model,
      history: history.map(h => ({
        role: h.role,
        parts: [{ text: h.text }]
      })),
      config: { 
        systemInstruction: SYSTEM_PROMPT + getMemoryContext(user) + `\n\nCurrent Lesson Context: ${context.topic}`,
        temperature: 0.7
      }
    });

    const result = await chat.sendMessage({ message: question });
    return result.text || "I was unable to synchronize a response.";
  } catch (error: any) {
    console.error("TutorX Chat Error:", error);
    return `Neural Link Interrupted: ${error.message}`;
  }
};

export const generateGeminiSpeech = async (text: string, voiceName: string = 'Kore'): Promise<string> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this segment clearly: ${text.substring(0, 5000)}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio synthesis returned no data.");
    return base64Audio;
  } catch (error: any) {
    console.error("TutorX TTS Error:", error);
    throw error;
  }
};
