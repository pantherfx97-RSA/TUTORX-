
import React, { useState } from 'react';
import { QuizQuestion } from '../types';

interface QuizViewProps {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
}

const QuizView: React.FC<QuizViewProps> = ({ questions, onComplete }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
  };

  const checkAnswer = () => {
    if (!selectedOption) return;
    
    const isCorrect = selectedOption === questions[currentIdx].correct_answer;
    if (isCorrect) setCorrectCount(prev => prev + 1);
    
    setUserAnswers(prev => [...prev, selectedOption]);
    setIsAnswered(true);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
    }
  };

  const handleRetry = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setCorrectCount(0);
    setUserAnswers([]);
    setShowResults(false);
  };

  const calculateScore = () => {
    if (questions.length === 0) return 0;
    return Math.round(((correctCount) / questions.length) * 100);
  };

  const handleFinalSubmit = () => {
    onComplete(calculateScore());
  };

  if (showResults) {
    const finalScore = calculateScore();
    return (
      <div className="max-w-xl mx-auto space-y-8 animate-in zoom-in-95 duration-500 pb-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-indigo-100 dark:bg-indigo-900/30 border-4 border-white dark:border-slate-800 shadow-xl mb-2">
            <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{finalScore}%</span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Examination Complete</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Your score has been processed and ready for neural archival.</p>
        </div>

        <div className="space-y-6">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 ml-1">Answer Key Review</h3>
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-[2rem] shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Question {idx + 1}</span>
                  {userAnswers[idx] === q.correct_answer ? (
                    <span className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded">Correct</span>
                  ) : (
                    <span className="text-[9px] font-black text-rose-500 uppercase bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded">Incorrect</span>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">{q.question}</p>
                <div className="grid grid-cols-1 gap-2 pt-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100/50 dark:border-emerald-900/30">
                    <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    <span>Correct: {q.correct_answer}</span>
                  </div>
                  {userAnswers[idx] !== q.correct_answer && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                      <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                      <span>Your choice: {userAnswers[idx]}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleRetry}
            className="py-5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Retry Exam
          </button>
          <button
            onClick={handleFinalSubmit}
            className="py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
          >
            Submit Results
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in zoom-in-95 duration-300">
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          <span>Question {currentIdx + 1} of {questions.length}</span>
          <span>{Math.round(((currentIdx + 1) / Math.max(questions.length, 1)) * 100)}%</span>
        </div>
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
          <div 
            className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentIdx + 1) / Math.max(questions.length, 1)) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight tracking-tight">
          {currentQuestion?.question || "Error loading question."}
        </h3>

        <div className="space-y-3.5">
          {currentQuestion?.options.map((option, idx) => {
            let stateClass = 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20';
            const isCorrect = option === currentQuestion.correct_answer;
            const isUserSelection = option === selectedOption;

            if (isAnswered) {
              if (isCorrect) stateClass = 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 ring-4 ring-emerald-500/10 animate-success-pop';
              else if (isUserSelection) stateClass = 'bg-rose-50 dark:bg-rose-900/20 border-rose-500 dark:border-rose-600 text-rose-700 dark:text-rose-300';
              else stateClass = 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 opacity-40';
            } else if (isUserSelection) {
              stateClass = 'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 ring-4 ring-indigo-500/10';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(option)}
                disabled={isAnswered}
                className={`w-full p-6 rounded-[1.5rem] border-2 text-left font-bold transition-all flex items-center justify-between group active:scale-[0.99] ${stateClass}`}
              >
                <span className="text-sm sm:text-base leading-tight">{option}</span>
                {isAnswered && isCorrect && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {isAnswered && isUserSelection && !isCorrect && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-4">
        {isAnswered ? (
          <button
            onClick={handleNext}
            className="w-full py-5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-2"
          >
            {currentIdx < questions.length - 1 ? 'Proceed to Next' : 'Calculate Results'}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        ) : (
          <button
            onClick={checkAnswer}
            disabled={!selectedOption}
            className={`w-full py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 ${!selectedOption ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            Verify Selection
          </button>
        )}
      </div>
    </div>
  );
};

export default QuizView;
