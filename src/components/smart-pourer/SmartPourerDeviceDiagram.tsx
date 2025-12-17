import React from 'react';

const SmartPourerDeviceDiagram = () => {
  return (
    <div className="flex flex-col items-center gap-3">
      <svg 
        viewBox="0 0 80 180" 
        className="w-16 h-36 md:w-20 md:h-44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Pour Spout - narrow tube */}
        <path 
          d="M35 0 L45 0 L46 45 L34 45 Z" 
          fill="#1a1a1a" 
          stroke="#333"
          strokeWidth="1"
        />
        
        {/* Flow sensor ring - micro */}
        <ellipse 
          cx="40" 
          cy="48" 
          rx="8" 
          ry="3" 
          fill="#f59e0b" 
          opacity="0.9"
        />
        
        {/* Main body - sleek rounded shape */}
        <path 
          d="M22 52 
             C14 56, 10 68, 10 82
             C10 105, 14 128, 22 145
             L58 145
             C66 128, 70 105, 70 82
             C70 68, 66 56, 58 52
             Z" 
          fill="#0a0a0a" 
          stroke="#333"
          strokeWidth="1"
        />
        
        {/* Inner body highlight */}
        <path 
          d="M26 56 
             C20 60, 16 70, 16 82
             C16 102, 19 122, 26 138
             L54 138
             C61 122, 64 102, 64 82
             C64 70, 60 60, 54 56
             Z" 
          fill="url(#bodyGradient)" 
          opacity="0.3"
        />
        
        {/* BLE chip - micro sized */}
        <rect 
          x="30" 
          y="72" 
          width="20" 
          height="12" 
          rx="2" 
          fill="#f59e0b"
        />
        <text 
          x="40" 
          y="80" 
          textAnchor="middle" 
          fill="#000" 
          fontSize="5" 
          fontWeight="bold"
        >
          BLE
        </text>
        
        {/* LED indicator - micro */}
        <circle 
          cx="40" 
          cy="100" 
          r="4" 
          fill="#22c55e"
          className="animate-pulse"
        />
        <circle 
          cx="40" 
          cy="100" 
          r="6" 
          fill="none"
          stroke="#22c55e"
          strokeWidth="0.5"
          opacity="0.5"
        />
        
        {/* Bottom seal - subtle */}
        <ellipse 
          cx="40" 
          cy="148" 
          rx="18" 
          ry="5" 
          fill="#333"
          opacity="0.4"
        />
        
        {/* Gradients */}
        <defs>
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#222" />
            <stop offset="50%" stopColor="#333" />
            <stop offset="100%" stopColor="#222" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Feature labels - compact chips */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px] w-full max-w-[200px]">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Pour Spout</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Flow Sensor</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">BLE Chip</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-muted-foreground">LED Status</span>
        </div>
      </div>
    </div>
  );
};

export default SmartPourerDeviceDiagram;
