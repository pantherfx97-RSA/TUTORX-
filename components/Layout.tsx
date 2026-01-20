
import React from 'react';
import { DEVELOPER_CREDIT, APP_NAME } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  userEmail?: string;
  onLogout?: () => void;
  onNavigate?: (screen: any) => void;
  isDarkMode?: boolean;
  toggleDarkMode?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, userEmail, onLogout, onNavigate, isDarkMode, toggleDarkMode }) => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center h-16 px-4">
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => onNavigate?.('dashboard' as any)}
          >
            {/* New Neural-X Logo */}
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none transform transition-all group-hover:rotate-12 group-hover:scale-110 active:scale-90">
              <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
                <path d="M18 18L46 46" stroke="white" strokeWidth="8" strokeLinecap="round" />
                <path d="M46 18L18 46" stroke="white" strokeWidth="8" strokeLinecap="round" strokeOpacity="0.4" />
                <circle cx="32" cy="32" r="5" fill="white" className="animate-pulse" />
              </svg>
            </div>
            <h1 className="text-xl font-black tracking-tighter text-slate-800 dark:text-slate-100">
              Tutor<span className="text-indigo-600 dark:text-indigo-400">X</span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 active:scale-90"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>

            {userEmail && (
              <>
                <button 
                  onClick={() => onNavigate?.('profile' as any)}
                  className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 active:scale-90"
                  title="Profile"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
                <button 
                  onClick={onLogout}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-sm font-black transition-all active:scale-95 shadow-lg shadow-indigo-100 dark:shadow-none"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-4xl w-full mx-auto p-4 sm:p-6 mb-16 transition-colors duration-300">
        {children}
      </main>

      {/* Footer / Acknowledgment */}
      <footer className="bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-8 transition-colors duration-300">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">
            {DEVELOPER_CREDIT}
          </p>
          <div className="flex justify-center space-x-6 text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-700">
            <span>&copy; {new Date().getFullYear()} TutorX</span>
            <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full my-auto"></span>
            <span>AI Masterclass Engine</span>
            <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full my-auto"></span>
            <span>Build v1.1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
