import React from 'react';

export const Button = React.memo((props: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) => (
  <button {...props} className={`w-full md:w-auto px-4 py-2 bg-[#1e3a5f] text-white rounded-lg transition-all hover:bg-[#152d47] active:scale-95 flex items-center justify-center text-sm font-bold shadow-md ${props.className ?? ''}`} />
));