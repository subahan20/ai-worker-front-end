import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 ease-in-out" 
        onClick={onClose} 
      />
      
      {/* Modal Container */}
      <div className="relative bg-[#0f0f0f] border border-[#1a1a1a] w-full max-w-xl rounded-[2.5rem] p-8 md:p-10 shadow-2xl transition-all duration-300 ease-out animate-in zoom-in-95 fade-in">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-bold text-white tracking-tighter italic uppercase">{title}</h3>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/5 text-[#444] hover:text-white transition-all active:scale-90"
            aria-label="Close modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
