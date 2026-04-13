import React from 'react';

export const Card = React.memo((props: React.HTMLAttributes<HTMLDivElement> & { className?: string }) => (
  <div {...props} className={`bg-white border border-slate-100 rounded-2xl shadow-sm ${props.className ?? ''}`} />
));