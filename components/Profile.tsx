
import React, { useMemo, useState, useRef } from 'react';
import { UserProfile, SubscriptionTier, DocumentAnalysis } from '../types';
import { DEVELOPER_CREDIT, APP_NAME } from '../constants';
import { analyzeDocument } from '../services/geminiService';

interface ProfileProps {
  user: UserProfile;
  onUpdateUser?: (updated: UserProfile) => void;
  onTriggerUpgrade?: (tier: SubscriptionTier) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdateUser, onTriggerUpgrade }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const scores = user.quizScores || [];
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((acc, s) => acc + s.score, 0) / scores.length) : 0;
    const bestTopic = scores.length > 0 ? [...scores].sort((a,b) => b.score - a.score)[0] : null;
    return { avgScore, bestTopic };
  }, [user.quizScores]);

  const isPremium = user.tier !== SubscriptionTier.FREE;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isPremium) {
      onTriggerUpgrade?.(SubscriptionTier.PREMIUM);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const analysis = await analyzeDocument(base64, file.type, user);
        
        const newDoc: DocumentAnalysis = {
          fileName: file.name,
          analysis,
          date: Date.now()
        };

        const updatedUser = {
          ...user,
          uploadedDocuments: [newDoc, ...(user.uploadedDocuments || [])]
        };

        onUpdateUser?.(updatedUser);
        setAnalysisResult(analysis);
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert("Neural Analysis Error: " + err.message);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-right-4 duration-500 max-w-2xl mx-auto pb-20">
      {/* Premium Profile Header */}
      <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden relative transition-all group">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        </div>
        
        <div className="relative mt-12 px-8 pb-8 flex flex-col items-center">
          <div className="w-28 h-28 bg-white dark:bg-slate-900 rounded-[2rem] p-1.5 shadow-2xl relative transform transition-transform group-hover:scale-105">
            <div className="w-full h-full bg-slate-50 dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center text-5xl font-black text-indigo-600 dark:text-indigo-400">
              {user.email[0].toUpperCase()}
            </div>
            {user.streak > 0 && (
              <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white p-2 rounded-xl shadow-lg animate-bounce duration-1000">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
            )}
          </div>
          
          <div className="mt-6 text-center space-y-1">
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-50">{user.email}</h2>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">{user.tier} Tier</span>
              <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-full">{user.preferredLevel}</span>
              {user.streak > 1 && <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">{user.streak} Day Streak</span>}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 w-full">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{user.completedTopics.length}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lessons</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.avgScore}%</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Avg Score</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{user.learningProgress}%</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Mastery</p>
            </div>
          </div>
        </div>
      </section>

      {/* Neural Document Analysis - Gated Feature */}
      <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
            Neural Document Analysis
          </h3>
          {!isPremium && (
             <span className="text-[8px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg uppercase tracking-widest">Premium Only</span>
          )}
        </div>

        <div className="relative group">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            accept=".pdf,.txt,.png,.jpg,.jpeg"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className={`w-full py-8 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all ${
              isPremium 
              ? 'border-indigo-100 dark:border-indigo-900 hover:border-indigo-500 bg-slate-50 dark:bg-slate-950' 
              : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 cursor-not-allowed grayscale'
            }`}
          >
            {isAnalyzing ? (
              <div className="flex flex-col items-center gap-3">
                 <svg className="animate-spin h-8 w-8 text-indigo-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                 <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Syncing Neural Core...</span>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">Upload Research Paper or Notes</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">PDF, Image, or Text (Max 10MB)</p>
                </div>
              </>
            )}
          </button>
        </div>

        {analysisResult && (
          <div className="bg-indigo-50 dark:bg-indigo-950/40 p-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/50 animate-in fade-in slide-in-from-top-4">
             <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Neural Breakdown Complete</span>
                <button onClick={() => setAnalysisResult(null)} className="text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest">Close</button>
             </div>
             <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-medium">
                <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed">{analysisResult}</pre>
             </div>
          </div>
        )}

        {/* Previous Uploads */}
        {user.uploadedDocuments && user.uploadedDocuments.length > 0 && (
          <div className="space-y-4 pt-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Archive History</p>
            <div className="space-y-3">
              {user.uploadedDocuments.slice(0, 3).map((doc, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setAnalysisResult(doc.analysis)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between group hover:border-indigo-500 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl text-slate-400 group-hover:text-indigo-500">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{doc.fileName}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(doc.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-indigo-600 dark:text-indigo-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M9 5l7 7-7 7" /></svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Mastery Analytics Breakdown */}
      <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
        <div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
            Mastery Analytics
          </h3>
          
          <div className="space-y-6">
            {user.weakTopics.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Focus Areas (Needs Improvement)</p>
                <div className="flex flex-wrap gap-2">
                  {user.weakTopics.map((topic, i) => (
                    <span key={i} className="text-[10px] font-bold bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-3 py-1 rounded-xl border border-rose-100 dark:border-rose-900/30">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {stats.bestTopic && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Star Pupil Domain</p>
                  <p className="font-bold text-slate-800 dark:text-slate-100 truncate max-w-[200px]">{stats.bestTopic.topic}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.bestTopic.score}%</p>
                  <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Top Performance</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Milestones</p>
              <div className="relative pl-6 space-y-6 border-l-2 border-slate-100 dark:border-slate-800 ml-1">
                {user.quizScores.slice(-3).reverse().map((record, idx) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[27px] top-1 w-2.5 h-2.5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500"></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{record.topic}</p>
                        <p className="text-[10px] font-medium text-slate-400">{new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {record.difficulty}</p>
                      </div>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${record.score >= 80 ? 'text-emerald-600 bg-emerald-50' : record.score >= 50 ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 bg-slate-50'}`}>
                        {record.score}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About TutorX Section */}
      <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-6 transition-all hover:border-indigo-500/30">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
          About TutorX
        </h3>
        
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
            TutorX is an AI-powered tutoring application designed to help students learn smarter, understand concepts clearly, and prepare effectively for exams.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            TutorX focuses on explanation, guidance, and learning clarity, not just answers. It assists students with homework, exam preparation, and concept breakdown across multiple subjects.
          </p>
          
          <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
             <div className="flex items-center gap-3">
               {/* Unified Neural-X Brand Icon */}
               <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                    <path d="M18 18L46 46" stroke="white" strokeWidth="8" strokeLinecap="round" />
                    <path d="M46 18L18 46" stroke="white" strokeWidth="8" strokeLinecap="round" strokeOpacity="0.4" />
                    <circle cx="32" cy="32" r="5" fill="white" className="animate-pulse" />
                  </svg>
               </div>
               <div>
                 <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Built & Maintained By</p>
                 <p className="text-sm font-black text-slate-800 dark:text-slate-100">Cipher X Inc</p>
               </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-800 pt-4">
                <div>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Founder</p>
                   <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Wally Nthani</p>
                </div>
                <div>
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Company</p>
                   <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Cipher X Inc</p>
                </div>
             </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-2xl">
            <svg className="w-4 h-4 text-indigo-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 italic leading-relaxed">
              TutorX is continuously evolving, with new features being added to improve learning experiences for students.
            </p>
          </div>
        </div>
      </section>

      {/* Support & Help Section */}
      <section className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
          Support & Help
        </h3>
        
        <div className="space-y-6">
          <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-3xl border border-indigo-100/50 dark:border-indigo-800/50 space-y-4">
             <div className="space-y-1">
                <h4 className="text-lg font-black text-indigo-600 dark:text-indigo-400 tracking-tight">TutorX Support</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                   Need help or have feedback? We’re here to help. If you experience any issues, have questions, or want to suggest improvements, please contact our support team.
                </p>
             </div>

             <div className="space-y-2">
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Support Coverage Includes:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                   {[
                     "Account or login issues",
                     "App functionality questions",
                     "Feature requests",
                     "Bug reports",
                     "General feedback"
                   ].map((item, i) => (
                     <div key={i} className="flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <div className="w-1 h-1 rounded-full bg-indigo-400"></div>
                        {item}
                     </div>
                   ))}
                </div>
             </div>

             <div className="pt-4 border-t border-indigo-100 dark:border-indigo-800/50 space-y-3">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 italic leading-relaxed">
                   TutorX is actively being improved, and your feedback helps shape future updates.
                </p>
                <div className="flex flex-col gap-1">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Developed By: Cipher X Inc</p>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Founder: Wally Nthani</p>
                </div>
                <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Thank you for using TutorX</p>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <a 
              href="mailto:cipherxinc@gmail.com" 
              className="group flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all hover:border-indigo-500 active:scale-95"
            >
              <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Support</p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">cipherxinc@gmail.com</p>
              </div>
            </a>

            <a 
              href="https://wa.me/27823737887" 
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all hover:border-emerald-500 active:scale-95"
            >
              <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp Chat</p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">+27 82 373 7887</p>
              </div>
            </a>

            <a 
              href="https://www.facebook.com/share/1LGV5mkfaZ/?mibextid=wwXIfr" 
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all hover:border-blue-500 active:scale-95"
            >
              <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Community Hub</p>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Facebook Support</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      <footer className="pt-8 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 italic leading-relaxed uppercase tracking-wider text-center">
          {DEVELOPER_CREDIT}
        </p>
      </footer>
    </div>
  );
};

export default Profile;
