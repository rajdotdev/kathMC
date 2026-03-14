import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-center py-8 gap-4 print:hidden">
      <h1 className="font-display text-5xl md:text-6xl uppercase tracking-tighter bg-action text-white px-4 py-2 neo-border neo-shadow-static transform -rotate-2">
        KathMC
      </h1>
    </header>
  );
};
