import React from 'react';

const SmartPourerDeviceDiagram = () => {
  return (
    <div className="flex flex-col items-center gap-4">
      <svg 
        viewBox="0 0 120 280" 
        className="w-24 h-56 md:w-32 md:h-72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Pour Spout - top tube */}
        <path 
          d="M50 0 L70 0 L72 80 L48 80 Z" 
          fill="hsl(var(--muted))" 
          stroke="hsl(var(--border))" 
          strokeWidth="1.5"
        />
        
        {/* Flow sensor ring */}
        <ellipse 
          cx="60" 
          cy="85" 
          rx="14" 
          ry="6" 
          fill="hsl(var(--primary))" 
          opacity="0.8"
        />
        
        {/* Main body - cork-like shape */}
        <path 
          d="M35 90 
             C25 95, 20 110, 20 130
             C20 160, 25 190, 35 220
             L85 220
             C95 190, 100 160, 100 130
             C100 110, 95 95, 85 90
             Z" 
          fill="url(#bodyGradient)" 
          stroke="hsl(var(--border))" 
          strokeWidth="1.5"
        />
        
        {/* BLE chip area */}
        <rect 
          x="45" 
          y="120" 
          width="30" 
          height="20" 
          rx="3" 
          fill="hsl(var(--primary))" 
          opacity="0.9"
        />
        <text 
          x="60" 
          y="133" 
          textAnchor="middle" 
          fill="hsl(var(--primary-foreground))" 
          fontSize="6" 
          fontWeight="bold"
        >
          BLE
        </text>
        
        {/* LED indicator */}
        <circle 
          cx="60" 
          cy="160" 
          r="6" 
          fill="#22c55e"
          className="animate-pulse"
        />
        <circle 
          cx="60" 
          cy="160" 
          r="8" 
          fill="none"
          stroke="#22c55e"
          strokeWidth="1"
          opacity="0.5"
        />
        
        {/* Bottom seal ring */}
        <ellipse 
          cx="60" 
          cy="225" 
          rx="28" 
          ry="8" 
          fill="hsl(var(--muted-foreground))" 
          opacity="0.4"
        />
        
        {/* Gradients */}
        <defs>
          <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--muted))" />
            <stop offset="50%" stopColor="hsl(var(--card))" />
            <stop offset="100%" stopColor="hsl(var(--muted))" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Feature labels */}
      <div className="grid grid-cols-2 gap-2 text-xs md:text-sm w-full max-w-xs">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-muted-foreground">Pour Spout</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-muted-foreground">Flow Sensor</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-muted-foreground">BLE Chip</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-muted-foreground">LED Status</span>
        </div>
      </div>
    </div>
  );
};

export default SmartPourerDeviceDiagram;
