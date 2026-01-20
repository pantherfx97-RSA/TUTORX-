
export enum DifficultyLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced'
}

export enum SubscriptionTier {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM', // Intermediate features
  PRO = 'PRO'       // Advanced features
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
}

export interface NextTopic {
  topic: string;
  difficulty: string;
}

export interface DocumentAnalysis {
  fileName: string;
  analysis: string;
  date: number;
}

export interface LessonContent {
  topic: string;
  lesson: string;
  summary: string[];
  quiz: QuizQuestion[];
  next_topics: NextTopic[];
  // New Tiered Exam-Ready Metadata
  exam_metadata?: {
    mark_allocation?: string;
    common_mistakes?: string[];
    time_saving_shortcuts?: string[];
    alternative_methods?: string[];
    examiner_mindset_tips?: string;
  };
}

export interface QuizScoreRecord {
  topic: string;
  score: number;
  date: number; // Timestamp
  difficulty: DifficultyLevel;
}

export interface UserProfile {
  email: string;
  displayName?: string;
  learningProgress: number; 
  completedTopics: string[];
  quizScores: QuizScoreRecord[];
  tier: SubscriptionTier;
  streak: number;
  lastActiveDate?: number;
  // Learning Memory fields
  weakTopics: string[];
  preferredLevel: string; // "High School" or "University"
  examType?: string;
  // Daily Limit fields
  dailyQuestionCount: number;
  lastQuestionResetDate: number;
  // File Analysis fields
  uploadedDocuments: DocumentAnalysis[];
}

export enum AppScreen {
  LANDING = 'landing',
  LOGIN = 'login',
  REGISTER = 'register',
  FORGOT_PASSWORD = 'forgot_password',
  DASHBOARD = 'dashboard',
  PROFILE = 'profile',
  LEARNING = 'learning'
}
