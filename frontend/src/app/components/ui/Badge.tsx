import React from 'react';

export const Badge = React.memo((props: React.HTMLAttributes<HTMLSpanElement> & { className?: string }) => (
  <span {...props} className={`px-2.5 py-1 rounded-md text-[10px] font-bold border flex items-center gap-1 w-fit uppercase ${props.className ?? ''}`} />
));