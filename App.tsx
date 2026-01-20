
import React, { useState, useEffect, useCallback } from 'react';
import { AppScreen, UserProfile, DifficultyLevel, LessonContent, SubscriptionTier, QuizScoreRecord } from './types.ts';
import { mockAuth, mockFirestore } from './services/firebaseService.ts';
import { generateLesson } from './services/geminiService.ts';
import Layout from './components/Layout.tsx';
import Auth from './components/Auth.tsx';
import Dashboard from './components/Dashboard.tsx';
import Profile from './components/Profile.tsx';
import LessonView from './components/LessonView.tsx';
import UpgradeModal from './components/UpgradeModal.tsx';
import LandingPage from './components/LandingPage.tsx';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.LANDING);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [activeLesson, setActiveLesson] = useState<LessonContent | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<DifficultyLevel>(DifficultyLevel.BEGINNER);
  
  const [landingData, setLandingData] = useState({ level: 'High School', examType: '' });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem('tutorx_theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [targetTier, setTargetTier] = useState<SubscriptionTier>(SubscriptionTier.PREMIUM);

  const checkAndResetDailyLimit = useCallback((profile: UserProfile): UserProfile => {
    const now = Date.now();
    const lastReset = profile.lastQuestionResetDate || 0;
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (now - lastReset >= twentyFourHours) {
      return {
        ...profile,
        dailyQuestionCount: 0,
        lastQuestionResetDate: now
      };
    }
    return profile;
  }, []);

  useEffect(() => {
    const stored = mockAuth.getStoredUser();
    if (stored) {
      const updatedUser = checkAndResetDailyLimit(stored);
      setUser(updatedUser);
      localStorage.setItem('tutorx_user', JSON.stringify(updatedUser));
      setCurrentScreen(AppScreen.DASHBOARD);
    }
  }, [checkAndResetDailyLimit]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tutorx_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tutorx_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleAuth = async (email: string, pass: string) => {
    setAuthLoading(true);
    setError(undefined);
    try {
      let loggedUser;
      if (currentScreen === AppScreen.REGISTER || currentScreen === AppScreen.LANDING) {
        loggedUser = await mockAuth.register(email, pass, landingData);
      } else {
        loggedUser = await mockAuth.login(email, pass);
      }
      
      if (loggedUser) {
        const checkedUser = checkAndResetDailyLimit(loggedUser);
        setUser(checkedUser);
        setCurrentScreen(AppScreen.DASHBOARD);
      }
    } catch (err) {
      setError('Authentication failed. Please check your credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    mockAuth.logout();
    setUser(null);
    setCurrentScreen(AppScreen.LANDING);
    setActiveLesson(null);
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    localStorage.setItem('tutorx_user', JSON.stringify(updatedUser));
  };

  const startLearning = async (topic: string, level: DifficultyLevel) => {
    setLoading(true);
    setActiveDifficulty(level);
    try {
      const content = await generateLesson(topic, level, user || undefined);
      setActiveLesson(content);
      setCurrentScreen(AppScreen.LEARNING);
    } catch (err: any) {
      console.error("AI Engine Error:", err);
      alert(`AI Engine Notice: ${err.message || "An error occurred."}`);
    } finally {
      setLoading(false);
    }
  };

  const incrementQuestionCount = async () => {
    if (!user) return;
    const updatedUser = { ...user, dailyQuestionCount: (user.dailyQuestionCount || 0) + 1 };
    handleUpdateUser(updatedUser);
  };

  const recordActivity = async (score: number, isMasteryOnly: boolean = false) => {
    if (!user || !activeLesson) return;
    
    const now = Date.now();
    const isNewDay = !user.lastActiveDate || 
      new Date(user.lastActiveDate).toDateString() !== new Date(now).toDateString();
    
    const newScoreRecord: QuizScoreRecord = {
      topic: activeLesson.topic,
      score: score,
      date: now,
      difficulty: activeDifficulty
    };

    let weakTopics = [...user.weakTopics];
    if (score < 70 && !weakTopics.includes(activeLesson.topic)) {
      weakTopics.push(activeLesson.topic);
    } else if (score >= 85) {
      weakTopics = weakTopics.filter(t => t !== activeLesson.topic);
    }

    const updatedUser: UserProfile = {
      ...user,
      learningProgress: Math.min(100, user.learningProgress + (isMasteryOnly ? 2 : 5)),
      completedTopics: [...new Set([...user.completedTopics, activeLesson.topic])],
      quizScores: [...user.quizScores, newScoreRecord],
      streak: isNewDay ? (user.streak || 0) + 1 : (user.streak || 1),
      lastActiveDate: now,
      weakTopics: weakTopics
    };
    
    handleUpdateUser(updatedUser);
    await mockFirestore.saveProgress(user.email, updatedUser);
  };

  const handleUpgrade = async (tier: SubscriptionTier) => {
    try {
      const updatedUser = await mockAuth.upgradeTier(tier);
      handleUpdateUser(updatedUser);
      setShowUpgrade(false);
    } catch (err) {
      alert("Payment verification failed.");
    }
  };

  const renderContent = () => {
    if (!user) {
      return (
        <LandingPage 
          currentAuthScreen={currentScreen === AppScreen.LANDING ? AppScreen.REGISTER : currentScreen}
          onAuth={handleAuth}
          onNavigate={(screen) => setCurrentScreen(screen)}
          onCaptureLandingData={(level, exam) => setLandingData({ level, examType: exam })}
          loading={authLoading}
          error={error}
        />
      );
    }

    return (
      <Layout 
        userEmail={user.email} 
        onLogout={handleLogout} 
        onNavigate={setCurrentScreen}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      >
        {currentScreen === AppScreen.DASHBOARD && (
          <Dashboard user={user} onStartLearning={startLearning} onTriggerUpgrade={(t) => { setTargetTier(t); setShowUpgrade(true); }} loading={loading} />
        )}
        {currentScreen === AppScreen.LEARNING && activeLesson && (
          <LessonView 
            content={activeLesson} 
            onComplete={recordActivity}
            onMarkMastery={(topic) => recordActivity(100, true)}
            onAskQuestion={incrementQuestionCount}
            onNavigate={(topic) => startLearning(topic, DifficultyLevel.BEGINNER)} 
            onTriggerUpgrade={(t) => { setTargetTier(t); setShowUpgrade(true); }}
            onBack={() => setCurrentScreen(AppScreen.DASHBOARD)}
            tier={user.tier}
            userProfile={user}
          />
        )}
        {currentScreen === AppScreen.PROFILE && (
          <Profile 
            user={user} 
            onUpdateUser={handleUpdateUser} 
            onTriggerUpgrade={(t) => { setTargetTier(t); setShowUpgrade(true); }} 
          />
        )}
      </Layout>
    );
  };

  return (
    <div className="antialiased">
      {renderContent()}
      {showUpgrade && (
        <UpgradeModal 
          targetTier={targetTier} 
          onClose={() => setShowUpgrade(false)} 
          onUpgrade={handleUpgrade} 
        />
      )}
    </div>
  );
};

export default App;
