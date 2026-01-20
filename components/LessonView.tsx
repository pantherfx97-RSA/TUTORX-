
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LessonContent, SubscriptionTier, UserProfile, DifficultyLevel } from '../types.ts';
import QuizView from './QuizView.tsx';
import { askTutor, generateGeminiSpeech } from '../services/geminiService.ts';
import { jsPDF } from 'jspdf';

interface LessonViewProps {
  content: LessonContent;
  onComplete: (score: number) => void;
  onMarkMastery: (topic: string) => void;
  onAskQuestion: () => void;
  onNavigate: (topic: string) => void;
  onTriggerUpgrade: (tier: SubscriptionTier) => void;
  onBack: () => void;
  tier: SubscriptionTier;
  userProfile?: UserProfile;
}

type Tab = 'learn' | 'review' | 'ask' | 'exam' | 'voice' | 'next';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const AVAILABLE_VOICES = [
  { id: 'Kore', label: 'Energetic', icon: '⚡' },
  { id: 'Puck', label: 'Friendly', icon: '🤝' },
  { id: 'Zephyr', label: 'Professional', icon: '👔' },
  { id: 'Fenrir', label: 'Warm', icon: '🔥' },
  { id: 'Charon', label: 'Serious', icon: '⚖️' },
];

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const StarConfetti = () => {
  const [stars, setStars] = useState<any[]>([]);
  useEffect(() => {
    const colors = ['#f59e0b', '#fbbf24', '#4f46e5', '#818cf8'];
    const newStars = Array.from({ length: 25 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 1}s`,
      duration: `${3 + Math.random() * 2}s`,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: `${Math.random() * 12 + 8}px`,
    }));
    setStars(newStars);
  }, []);
  return (
    <div className="fixed inset-0 pointer-events-none z-[110] overflow-hidden">
      {stars.map((s) => (
        <div key={s.id} className="absolute pointer-events-none" style={{ left: s.left, top: '-20px', animation: `confetti-fall ${s.duration} linear ${s.delay} forwards`, color: s.color }}>
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
        </div>
      ))}
    </div>
  );
};

const LessonView: React.FC<LessonViewProps> = ({ content, onComplete, onMarkMastery, onAskQuestion, onNavigate, onTriggerUpgrade, onBack, tier, userProfile }) => {
  const [activeTab, setActiveTab] = useState<Tab>('learn');
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  const isFree = tier === SubscriptionTier.FREE;
  const questionCount = userProfile?.dailyQuestionCount || 0;
  const hasExceededLimit = isFree && questionCount >= 100;

  useEffect(() => {
    if (activeTab === 'ask') scrollToBottom();
  }, [activeTab]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const stopAudio = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    activeSourcesRef.current.forEach(source => { try { source.stop(); } catch (e) {} });
    activeSourcesRef.current.clear();
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    window.speechSynthesis.cancel();
    nextStartTimeRef.current = 0;
    setIsSpeaking(false);
    setIsPaused(false);
    setIsSynthesizing(false);
  };

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
    stopAudio();
  };

  const fetchAndDecode = async (text: string, ctx: AudioContext) => {
    const base64 = await generateGeminiSpeech(text, selectedVoice);
    const bytes = decodeBase64(base64);
    return await decodeAudioData(bytes, ctx, 24000, 1);
  };

  const toggleSpeech = async () => {
    if (isSpeaking && !isPaused) {
      if (audioContextRef.current) audioContextRef.current.suspend();
      else window.speechSynthesis.pause();
      setIsPaused(true);
    } else if (isPaused) {
      if (audioContextRef.current) audioContextRef.current.resume();
      else window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      stopAudio();
      setIsSynthesizing(true);
      abortControllerRef.current = new AbortController();
      const chunks = content.lesson.split('\n\n').filter(c => c.trim().length > 0);
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = ctx;
        nextStartTimeRef.current = ctx.currentTime + 0.1;
        setIsSpeaking(true);
        const bufferPromises = chunks.map(chunk => fetchAndDecode(chunk, ctx));
        for (let i = 0; i < bufferPromises.length; i++) {
          if (abortControllerRef.current?.signal.aborted) break;
          const buffer = await bufferPromises[i];
          if (i === 0) setIsSynthesizing(false);
          if (!audioContextRef.current) break;
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          const startTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
          source.start(startTime);
          nextStartTimeRef.current = startTime + buffer.duration;
          activeSourcesRef.current.add(source);
          source.onended = () => {
            activeSourcesRef.current.delete(source);
            if (activeSourcesRef.current.size === 0 && i === chunks.length - 1) {
              setIsSpeaking(false);
              setIsPaused(false);
              nextStartTimeRef.current = 0;
            }
          };
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') setIsSpeaking(false);
      } finally {
        setIsSynthesizing(false);
      }
    }
  };

  const exportSummaryPDF = () => {
    setIsGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let cursorY = 25;

      doc.setTextColor(240, 240, 240);
      doc.setFontSize(60);
      doc.setFont("helvetica", "bold");
      doc.text("CONFIDENTIAL", pageWidth / 2, pageHeight / 2, { align: "center", angle: 45 });

      doc.setFillColor(79, 70, 229);
      doc.roundedRect(margin, cursorY - 10, 12, 12, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text("TX", margin + 6, cursorY - 3, { align: "center" });

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("TutorX Masterclass", margin + 16, cursorY - 2);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`DATE: ${new Date().toLocaleDateString()} | USER: ${userProfile?.email || 'Anonymous'}`, margin + 16, cursorY + 3);

      cursorY += 25;
      doc.setTextColor(79, 70, 229);
      doc.setFontSize(22);
      const titleLines = doc.splitTextToSize(content.topic, pageWidth - (margin * 2));
      doc.text(titleLines, margin, cursorY);
      cursorY += (titleLines.length * 10) + 10;

      doc.setTextColor(51, 65, 85);
      doc.setFontSize(12);
      doc.text("Neural Summary Extraction", margin, cursorY);
      cursorY += 8;
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 12;

      content.summary.forEach((point, idx) => {
        const bullet = `• `;
        const textLines = doc.splitTextToSize(point, pageWidth - (margin * 2) - 10);
        if (cursorY + (textLines.length * 7) > pageHeight - 30) {
          doc.addPage();
          cursorY = 25;
        }
        doc.setFont("helvetica", "bold");
        doc.text(bullet, margin, cursorY);
        doc.setFont("helvetica", "normal");
        doc.text(textLines, margin + 10, cursorY);
        cursorY += (textLines.length * 7) + 6;
      });

      doc.save(`TutorX_Summary_${content.topic.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("PDF Export Error:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping || streamingMessage || hasExceededLimit) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);
    scrollToBottom();
    
    // Call the callback to increment daily count
    onAskQuestion();

    try {
      const response = await askTutor(userMsg, content, chatHistory, userProfile);
      setIsTyping(false); 
      let currentText = "";
      for (let i = 0; i < response.length; i++) {
        currentText += response[i];
        setStreamingMessage(currentText);
        if (i % 12 === 0) scrollToBottom();
        await new Promise(r => setTimeout(r, 10));
      }
      setChatHistory(prev => [...prev, { role: 'model', text: response }]);
      setStreamingMessage('');
      scrollToBottom();
    } catch (error) {
      setIsTyping(false);
    }
  };

  const handleMarkMastery = async () => {
    setIsRecording(true);
    await onMarkMastery(content.topic);
    setLessonCompleted(true);
    setTimeout(() => { setIsRecording(false); setActiveTab('review'); }, 1200);
  };

  const TabButton = ({ id, label, icon }: { id: Tab; label: string; icon: React.ReactNode }) => {
    const active = activeTab === id;
    const isGated = isFree && (id === 'exam'); // Exam mode is purely premium
    const isLimited = isFree && (id === 'ask') && hasExceededLimit; // Ask is limited
    
    return (
      <button
        onClick={() => setActiveTab(id)}
        className={`flex flex-col items-center justify-center min-w-[70px] xs:min-w-[80px] h-16 sm:h-20 rounded-2xl transition-all relative shrink-0 active:scale-90 ${
          active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
        }`}
      >
        {(isGated || isLimited) && (
          <div className="absolute top-1 right-1 p-1 bg-slate-200 dark:bg-slate-700 rounded-lg scale-75">
             <svg className="h-3 w-3 text-slate-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
          </div>
        )}
        {icon}
        <span className="text-[9px] font-black uppercase mt-1.5 tracking-tighter">{label}</span>
      </button>
    );
  };

  const LockScreen = ({ feature, desc, btnLabel = "Upgrade to Unlock" }: { feature: string; desc: string; btnLabel?: string }) => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
      <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white mb-6 shadow-2xl shadow-indigo-200 dark:shadow-none">
        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
      </div>
      <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-3">{feature}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-xs mb-8">{desc}</p>
      <button 
        onClick={() => onTriggerUpgrade(SubscriptionTier.PREMIUM)}
        className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl"
      >
        {btnLabel}
      </button>
    </div>
  );

  const renderExamMeta = () => {
    if (!content.exam_metadata) return null;
    return (
      <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">Exam Architecture Analysis</h3>
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-1">Mark Allocation Strategy</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">{content.exam_metadata.mark_allocation || "Standardized allocation logic applied."}</p>
          </div>
          <div className="bg-rose-50 dark:bg-rose-900/10 p-5 rounded-3xl border border-rose-100 dark:border-rose-900/20">
            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-2">Common Logical Pitfalls</p>
            <ul className="space-y-2">
              {content.exam_metadata.common_mistakes?.map((m, i) => (
                <li key={i} className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-start gap-2">
                  <span className="text-rose-500 mt-0.5">•</span>{m}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 pb-10 max-w-4xl mx-auto w-full relative">
      {lessonCompleted && activeTab === 'learn' && <StarConfetti />}
      <div className="flex items-center">
        <button onClick={onBack} className="flex items-center space-x-2 text-slate-400 dark:text-slate-600 hover:text-indigo-600 font-black text-[10px] sm:text-xs uppercase tracking-widest transition-colors active:scale-95">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
          <span>Exit Portal</span>
        </button>
      </div>
      
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-4 sm:p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col min-h-[70dvh] transition-colors overflow-hidden">
        <div className="mb-6 px-2 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
           <div>
              <span className="text-[9px] sm:text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1 block">Active Curation</span>
              <h2 className="text-xl sm:text-3xl font-black text-slate-800 dark:text-slate-50 leading-tight tracking-tight">{content.topic}</h2>
           </div>
           
           <div className="flex items-center gap-2">
              <button 
                onClick={toggleSpeech}
                disabled={isSynthesizing && !isSpeaking}
                className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border-2 transition-all active:scale-95 shadow-lg ${
                  isSpeaking && !isPaused ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-200' : isPaused ? 'bg-amber-500 border-amber-500 text-white shadow-amber-200' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {isSynthesizing ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-indigo-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span className="text-[10px] font-black animate-pulse">Neural Streaming</span>
                  </div>
                ) : isSpeaking && !isPaused ? (
                  <div className="flex items-end gap-0.5 h-3 w-4">
                    <div className="w-1 bg-white h-full animate-audio-bounce"></div>
                    <div className="w-1 bg-white h-2/3 animate-audio-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-1 bg-white h-full animate-audio-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                )}
                {!isSynthesizing && <span className="text-[10px] font-black uppercase tracking-widest">{isSpeaking && !isPaused ? 'Pause AI' : isPaused ? 'Resume Read' : 'AI Read'}</span>}
              </button>
              {isSpeaking && <button onClick={stopAudio} className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-500 border border-rose-100 active:scale-90 transition-all"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg></button>}
           </div>
        </div>

        <div className="relative group mb-6">
           <div className="flex space-x-1 p-1.5 bg-slate-50 dark:bg-slate-950 rounded-3xl overflow-x-auto no-scrollbar">
            <TabButton id="learn" label="Lesson" icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" /></svg>} />
            <TabButton id="ask" label="AI Tutor" icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>} />
            <TabButton id="review" label="Summary" icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} />
            <TabButton id="exam" label="Quiz" icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            <TabButton id="voice" label="Settings" icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
            <TabButton id="next" label="Next Topics" icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>} />
           </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar">
          {activeTab === 'learn' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 relative">
              <div className="prose dark:prose-invert max-w-none relative">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium transition-all">
                  {content.lesson}
                </p>
              </div>
              {renderExamMeta()}
              {!lessonCompleted && <button onClick={handleMarkMastery} disabled={isRecording} className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95">{isRecording ? "Updating Neural Matrix..." : "Acknowledge Mastery"}</button>}
            </div>
          )}
          {activeTab === 'review' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">
              <div className="flex justify-between items-center px-2">
                <div className="space-y-1">
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Mastery Extraction</p>
                   <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">High-Yield Takeaways</p>
                </div>
                <button onClick={exportSummaryPDF} disabled={isGeneratingPDF} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                  Export Summary
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {content.summary.map((point, idx) => (
                  <div key={idx} className="flex gap-4 p-5 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 transition-all group">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'ask' && (
            hasExceededLimit ? 
            <LockScreen 
              feature="Daily Limit Reached" 
              desc="You have reached your daily limit of 100 questions. Service will be restored in 24 hours, or upgrade now for unlimited access." 
              btnLabel="Get Unlimited Access"
            /> :
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex justify-between items-center mb-4 px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neural Link Support</span>
                {isFree && <span className="text-[9px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800">{100 - questionCount} questions left today</span>}
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto mb-4 pr-2 no-scrollbar">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-3xl text-sm font-bold shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700'}`}>{msg.text}</div>
                  </div>
                ))}
                {streamingMessage && <div className="flex justify-start"><div className="max-w-[85%] p-4 rounded-3xl rounded-tl-none bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 text-sm font-bold">{streamingMessage}</div></div>}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="relative">
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask TutorX anything..." className="w-full pl-6 pr-14 py-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-sm font-bold outline-none" />
                <button type="submit" disabled={!chatInput.trim() || isTyping || hasExceededLimit} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-xl"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg></button>
              </form>
            </div>
          )}
          {activeTab === 'exam' && (
            isFree ? <LockScreen feature="Exam Quizzes Restricted" desc="Unlock step-by-step logic designed to help you ace university and high school exams." /> :
            <QuizView questions={content.quiz} onComplete={onComplete} />
          )}
          {activeTab === 'voice' && (
            <div className="h-full flex flex-col items-center justify-center space-y-8">
              <div className="w-full max-w-xs space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Neural Voice Selector</p>
                <div className="flex justify-between p-1 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100">
                  {AVAILABLE_VOICES.map((v) => (
                    <button key={v.id} onClick={() => handleVoiceChange(v.id)} className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${selectedVoice === v.id ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>{v.icon}</button>
                  ))}
                </div>
              </div>
              <button onClick={toggleSpeech} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">{isSpeaking && !isPaused ? "Pause Stream" : "Initialize Audio"}</button>
            </div>
          )}
          {activeTab === 'next' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {content.next_topics.map((t, idx) => (
                <button key={idx} onClick={() => onNavigate(t.topic)} className="p-6 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[2rem] text-left hover:border-indigo-500 transition-all active:scale-95">
                  <span className="text-[10px] font-black text-indigo-500 uppercase">{t.difficulty}</span>
                  <p className="font-bold text-slate-800 dark:text-slate-100 mt-2">{t.topic}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonView;
