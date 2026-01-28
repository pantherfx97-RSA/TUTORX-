
import React, { useState, useRef, useEffect } from 'react';
import { AppScreen } from '../types.ts';
import Auth from './Auth.tsx';
import { askTutor } from '../services/geminiService.ts';

interface LandingPageProps {
  currentAuthScreen: AppScreen;
  onAuth: (email: string, pass: string) => void;
  onNavigate: (screen: AppScreen) => void;
  onCaptureLandingData?: (level: string, exam: string) => void;
  loading: boolean;
  error?: string;
}

const LandingPage: React.FC<LandingPageProps> = ({ 
  currentAuthScreen, 
  onAuth, 
  onNavigate, 
  onCaptureLandingData,
  loading, 
  error 
}) => {
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('High School');
  const [examType, setExamType] = useState('');
  const [previewQuestion, setPreviewQuestion] = useState('');
  const [previewResponse, setPreviewResponse] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  
  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  
  const authRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen for the PWA install prompt event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsAppInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const scrollToAuth = () => {
    setShowAuth(true);
    setTimeout(() => {
      authRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  const handlePreviewAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewQuestion.trim() || isPreviewLoading) return;
    
    setIsPreviewLoading(true);
    try {
      const enhancedPrompt = `[Context: Subject: ${subject}, Level: ${level}, Exam Type: ${examType}] Question: ${previewQuestion}`;
      const guestContext = { 
        topic: subject || "General Study", 
        lesson: "", 
        summary: [], 
        quiz: [], 
        next_topics: [] 
      };
      
      const response = await askTutor(enhancedPrompt, guestContext, []);
      setPreviewResponse(response);
      onCaptureLandingData?.(level, examType);
      scrollToAuth();
    } catch (err) {
      setPreviewResponse("TutorX is processing many requests. Please initialize your portal below to continue.");
      scrollToAuth();
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* PWA Install Banner */}
      {deferredPrompt && !isAppInstalled && (
        <div className="fixed top-0 left-0 right-0 z-[100] animate-in slide-in-from-top duration-700">
          <div className="bg-indigo-600 dark:bg-indigo-900 px-4 py-3 sm:py-4 flex items-center justify-between text-white shadow-2xl border-b border-white/10">
            <div className="flex items-center gap-3">
              {/* Unified Neural-X Install Banner Logo */}
              <div className="hidden sm:flex w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl items-center justify-center shadow-inner">
                <svg viewBox="0 0 64 64" className="w-5 h-5 fill-white">
                  <path d="M18 18L46 46" stroke="white" strokeWidth="8" strokeLinecap="round" />
                  <path d="M46 18L18 46" stroke="white" strokeWidth="8" strokeLinecap="round" strokeOpacity="0.4" />
                </svg>
              </div>
              <div className="flex flex-col">
                <p className="text-[11px] sm:text-sm font-black uppercase tracking-tight leading-none">Initialize Mobile Link</p>
                <p className="text-[9px] sm:text-[10px] font-bold opacity-80 uppercase tracking-widest mt-1">Install TutorX to your home screen</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setDeferredPrompt(null)}
                className="text-[10px] font-black uppercase tracking-widest opacity-60 hover:opacity-100 px-3"
              >
                Dismiss
              </button>
              <button 
                onClick={handleInstallClick}
                className="bg-white text-indigo-600 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
              >
                Install Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className={`relative min-h-[90dvh] flex flex-col items-center justify-center px-4 pt-12 pb-20 transition-all duration-700 ${deferredPrompt && !isAppInstalled ? 'mt-16 sm:mt-20' : ''}`}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-indigo-500/10 blur-[100px] rounded-full"></div>
          <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-purple-500/10 blur-[100px] rounded-full"></div>
        </div>

        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative z-10">
          <div className="space-y-6 text-center lg:text-left">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                For high school & university students
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white leading-[1.05] tracking-tighter">
                Master Any Subject with <span className="text-indigo-600 dark:text-indigo-400">AI Precision.</span>
              </h1>
              
              <div className="flex flex-col items-center lg:items-start gap-5 pt-2">
                <p className="text-lg md:text-xl text-slate-500 dark:text-slate-400 font-bold">
                  Ask questions. Get step-by-step explanations.
                </p>
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
                  <button 
                    onClick={scrollToAuth}
                    className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 px-8 py-3 rounded-full shadow-2xl flex items-center gap-2 text-sm font-black hover:border-indigo-500 hover:scale-105 transition-all active:scale-95 text-slate-800 dark:text-slate-100"
                  >
                    <span className="text-xl">🚀</span>
                    Launch Masterclass!
                  </button>
                  {deferredPrompt && !isAppInstalled && (
                    <button 
                      onClick={handleInstallClick}
                      className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-100 dark:border-indigo-800 px-8 py-3 rounded-full flex items-center gap-2 text-sm font-black hover:bg-indigo-100 transition-all active:scale-95"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Install App
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Input fields for Subject and Exam */}
            <div className="space-y-6 pt-4">
              {!previewResponse ? (
                <form onSubmit={handlePreviewAsk} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-2">Subject</label>
                      <input 
                        type="text"
                        required
                        placeholder="e.g. Mathematics, History"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-5 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold outline-none focus:border-indigo-500 transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-2">Exam Type</label>
                      <input 
                        type="text"
                        placeholder="e.g. Matric, SAT, Finals"
                        value={examType}
                        onChange={(e) => setExamType(e.target.value)}
                        className="w-full px-5 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-bold outline-none focus:border-indigo-500 transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-2">Academic Level</label>
                    <div className="flex gap-3">
                      {['High School', 'University'].map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setLevel(l)}
                          className={`flex-1 py-3.5 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all ${
                            level === l 
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' 
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative group pt-4">
                    <input 
                      type="text" 
                      required
                      value={previewQuestion}
                      onChange={(e) => setPreviewQuestion(e.target.value)}
                      placeholder="Ask your first question..." 
                      className="w-full pl-6 pr-16 py-5 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-bold shadow-2xl focus:border-indigo-500 outline-none transition-all placeholder-slate-400"
                    />
                    <button 
                      type="submit" 
                      disabled={isPreviewLoading || !previewQuestion.trim()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-indigo-600 text-white rounded-2xl active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isPreviewLoading ? (
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : (
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border-2 border-indigo-100 dark:border-indigo-800 animate-in fade-in slide-in-from-bottom-4 max-w-xl mx-auto lg:mx-0 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16"></div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Response Synchronized</p>
                      <div className="flex gap-2">
                        <span className="text-[8px] font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded uppercase">{subject}</span>
                        <span className="text-[8px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 px-2 py-0.5 rounded uppercase">{level}</span>
                      </div>
                    </div>
                    <button onClick={() => setPreviewResponse('')} className="text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest">Clear</button>
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed italic">"{previewResponse.length > 200 ? previewResponse.substring(0, 200) + '...' : previewResponse}"</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Logic optimized for success.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="w-full max-w-md mx-auto" ref={authRef}>
            <div className={`transition-all duration-700 ${showAuth ? 'opacity-100 scale-100' : 'opacity-100 scale-100 lg:opacity-30 lg:scale-95 lg:grayscale lg:pointer-events-none'}`}>
              <Auth 
                type={currentAuthScreen} 
                onAuth={onAuth} 
                onNavigate={onNavigate} 
                loading={loading} 
                error={error} 
              />
            </div>
            {!showAuth && (
              <button 
                onClick={() => setShowAuth(true)}
                className="w-full mt-6 lg:hidden py-4.5 bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs uppercase tracking-widest rounded-3xl active:scale-95"
              >
                Skip Preview & Login
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Features Summary */}
      <section className="py-24 px-4 bg-white dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Academic Clearance Levels</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto">Precision tools for high school and university curriculum.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-50 dark:bg-slate-950 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-5 hover:border-indigo-300 transition-all group">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">Easy Mode</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">Foundational explanations using logic and analogies to bridge knowledge gaps effectively.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border-2 border-indigo-500 space-y-5 shadow-2xl transform hover:-translate-y-2 transition-all">
              <h3 className="text-xl font-black text-slate-800 dark:text-white">In-Depth</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">Deep structural analysis and logical mapping for complex professional domains and concepts.</p>
            </div>
            <div className="bg-slate-950 p-10 rounded-[2.5rem] border border-indigo-500/30 space-y-5 text-white hover:border-indigo-500 transition-all">
              <h3 className="text-xl font-black text-white">Exam-Ready</h3>
              <p className="text-sm text-slate-400 font-medium leading-relaxed">Technical, high-accuracy responses designed for SAT, Matric, and University Finals.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Footer */}
      <footer className="py-20 px-4 text-center space-y-8 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
           <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] leading-loose">
             Secure Infrastructure • Privacy Guaranteed • Built in South Africa
           </p>
           <p className="text-xs text-slate-400 font-medium italic">Developed by Wally Nthani • © 2025 TutorX Neural Engine</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
