
import React, { useState } from 'react';
import { SubscriptionTier } from '../types';
import { YOCO_LINKS } from '../constants';

interface UpgradeModalProps {
  onClose: () => void;
  onUpgrade: (tier: SubscriptionTier) => void;
  targetTier: SubscriptionTier;
}

type ModalView = 'features' | 'plans' | 'verifying';
type BillingCycle = 'monthly' | 'yearly';

const UpgradeModal: React.FC<UpgradeModalProps> = ({ onClose, onUpgrade, targetTier }) => {
  const [view, setView] = useState<ModalView>('features');
  const [verifying, setVerifying] = useState(false);

  const isPro = targetTier === SubscriptionTier.PRO;
  const tierName = isPro ? "PRO Clearance" : "PREMIUM Clearance";
  
  const price = {
    monthly: isPro ? "R199" : "R99",
    yearly: isPro ? "R1,990" : "R990"
  };

  const premiumFeatures = [
    { title: "Neural Document Analysis", desc: "Upload and analyze your own research papers, notes, or textbooks for instant summaries." },
    { title: "Exam-Ready Explanations", desc: "Unlock step-by-step logic designed to help you ace university and high school exams." },
    { title: "Adjust explanation level", desc: "Instantly toggle between simple conceptual 'easy' mode and full-depth 'exam-ready' mode." },
    { title: "Unlimited Study Tutor", desc: "Dedicated AI chat support for every single masterclass you generate today." }
  ];

  const proFeatures = [
    { title: "Neural Voice Lectures", desc: "Listen to any study topic with human-like AI voice generation while you travel or commute." },
    { title: "University-Grade Subjects", desc: "Access the 'Advanced' engine for professional, complex, and high-level academic domains." },
    { title: "Priority AI Link", desc: "Zero-latency connection to our most powerful Gemini 3 Pro reasoning core." },
    { title: "Infinite Archival", desc: "Secure, permanent storage for every question asked and every quiz score achieved." }
  ];

  const activeFeatures = isPro ? proFeatures : premiumFeatures;

  const handlePlanSelection = (cycle: BillingCycle) => {
    const tierKey = isPro ? 'PRO' : 'PREMIUM';
    const cycleKey = cycle === 'monthly' ? 'MONTHLY' : 'YEARLY';
    const link = YOCO_LINKS[tierKey][cycleKey];
    window.open(link, '_blank');
    setView('verifying');
  };

  const confirmPayment = () => {
    setVerifying(true);
    setTimeout(() => { onUpgrade(targetTier); }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800">
        
        {/* Header */}
        <div className={`p-6 sm:p-10 text-white relative ${isPro ? 'bg-indigo-600' : 'bg-indigo-500'}`}>
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
             <svg viewBox="0 0 64 64" className="w-32 h-32 fill-current"><path d="M18 18L46 46M46 18L18 46" stroke="white" strokeWidth="8" strokeLinecap="round" /></svg>
          </div>
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-1">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] bg-white/20 px-2 py-0.5 rounded">Uplink Upgrade</span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tighter">{tierName}</h2>
              <p className="text-indigo-100 text-[10px] sm:text-xs font-bold opacity-80 uppercase tracking-widest">Protocol Version 1.2.0</p>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-white/10 rounded-2xl transition-all active:scale-90 border border-white/20">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-10 max-h-[70vh] overflow-y-auto no-scrollbar">
          {view === 'features' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Tier Advantages</h3>
                <div className="grid grid-cols-1 gap-4">
                  {activeFeatures.map((f, i) => (
                    <div key={i} className="flex gap-4 p-5 bg-slate-50 dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 transition-all hover:border-indigo-500 group">
                      <div className="w-12 h-12 shrink-0 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black text-sm text-slate-800 dark:text-slate-100">{f.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{f.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => setView('plans')}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Configure Billing Plan
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M14 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          )}

          {view === 'plans' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-slate-800 dark:white">Choose your velocity</h3>
                <p className="text-xs text-slate-500 font-medium">Select a cycle to initialize secure Yoco payment.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={() => handlePlanSelection('monthly')} className="group p-6 rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 hover:border-indigo-500 bg-slate-50 dark:bg-slate-950 transition-all text-left active:scale-[0.98] flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Cycle</span>
                    <div className="mt-1 text-3xl font-black text-slate-900 dark:text-white leading-none">{price.monthly}<span className="text-xs font-normal text-slate-400">/mo</span></div>
                  </div>
                  <div className="mt-6 py-3 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-center text-[10px] font-black uppercase tracking-widest group-hover:bg-indigo-600 group-hover:text-white transition-colors">Select Monthly</div>
                </button>

                <button onClick={() => handlePlanSelection('yearly')} className="group p-6 rounded-[2rem] border-2 border-indigo-500 bg-white dark:bg-slate-900 transition-all text-left shadow-2xl active:scale-[0.98] relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-3 right-3 bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Save 20%</div>
                  <div>
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Yearly Cycle</span>
                    <div className="mt-1 text-3xl font-black text-slate-900 dark:text-white leading-none">{price.yearly}<span className="text-xs font-normal text-slate-400">/yr</span></div>
                  </div>
                  <div className="mt-6 py-3 bg-indigo-600 text-white rounded-xl text-center text-[10px] font-black uppercase tracking-widest group-hover:bg-indigo-700 shadow-lg">Select Yearly</div>
                </button>
              </div>
              
              <button onClick={() => setView('features')} className="w-full text-[10px] font-black text-slate-400 hover:text-indigo-500 uppercase tracking-[0.2em] transition-colors">← Back to Features</button>
            </div>
          )}

          {view === 'verifying' && (
            <div className="text-center py-12 space-y-8 animate-in slide-in-from-bottom-4">
              <div className="w-24 h-24 bg-amber-50 dark:bg-amber-900/20 rounded-full mx-auto flex items-center justify-center border-4 border-amber-100 dark:border-amber-800">
                <div className="relative">
                  <svg className="h-12 w-12 text-amber-500 animate-pulse-soft" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Payment Link Dispatched</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed px-6">We've opened the secure Yoco checkout in a new tab. Please complete the transaction there.</p>
              </div>
              <div className="space-y-4 px-4">
                <button 
                  onClick={confirmPayment} 
                  disabled={verifying} 
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.25em] shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                  {verifying ? (
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : "I've Paid — Activate Link"}
                </button>
                <button onClick={() => setView('plans')} className="text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors">Return to Plans</button>
              </div>
            </div>
          )}
        </div>

        {/* Payment Trust Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-6 opacity-40 grayscale group-hover:grayscale-0 transition-all">
           <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-500">Secured via Yoco API</span>
           <div className="w-1 h-1 rounded-full bg-slate-300"></div>
           <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-500">South African Encryption</span>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
