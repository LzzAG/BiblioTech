import React from 'react';

export const Label = React.memo((props: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label {...props} className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1" />
));