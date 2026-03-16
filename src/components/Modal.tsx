import React from 'react';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-true-black/50 backdrop-blur-sm">
      <div className="bg-paper neo-border neo-shadow-static w-full max-w-md relative">
        <div className="bg-action text-white p-4 neo-border border-t-0 border-l-0 border-r-0 flex justify-between items-center">
          <h3 className="font-display text-2xl uppercase">{title}</h3>
          <button onClick={onClose} className="font-bold text-xl hover:scale-110 transition-transform cursor-pointer">&times;</button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
