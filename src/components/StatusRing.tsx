import { ReactNode } from "react";

interface StatusRingProps {
  children: ReactNode;
  hasStatus: boolean;
  statusText?: string;
  emoji?: string;
  onAddClick?: () => void;
  showAddButton?: boolean;
  isNew?: boolean;
  className?: string;
}

const StatusRing = ({ 
  children, 
  hasStatus, 
  statusText,
  emoji,
  onAddClick,
  showAddButton = false,
  isNew = false,
  className = "" 
}: StatusRingProps) => {
  return (
    <div className={`relative inline-block ${className}`}>
      {/* New story white glow effect */}
      {isNew && (
        <div className="absolute -inset-1 rounded-full bg-white/40 animate-pulse blur-sm" />
      )}
      
      {hasStatus && statusText && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="relative group">
            {/* Outer glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/30 via-fuchsia-500/30 to-pink-500/30 rounded-3xl blur-lg opacity-75 animate-pulse" />
            
            {/* Premium status bubble with animated border */}
            <div className="relative">
              {/* Animated gradient border */}
              <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 rounded-2xl opacity-60 animate-[spin_3s_linear_infinite]" style={{ backgroundSize: '200% 200%' }} />
              
              {/* Inner content */}
              <div className="relative bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-2xl text-white px-4 py-2.5 rounded-2xl text-xs overflow-hidden min-h-[36px] flex items-center justify-center min-w-[90px] max-w-[140px]">
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                
                {/* Inner glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-violet-500/10 to-transparent" />
                
                <div className="relative flex items-center gap-2 justify-center">
                  {emoji && (
                    <span className="shrink-0 text-base drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                      {emoji}
                    </span>
                  )}
                  <div className="overflow-hidden flex-1 text-center">
                    <div className="animate-marquee whitespace-nowrap inline-block font-semibold tracking-wide">
                      {statusText}
                      {statusText.length > 10 && <span className="ml-8">{statusText}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Speech bubble connector - premium dots */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
              <div className="w-3 h-3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.4),0_2px_8px_rgba(0,0,0,0.5)] border border-violet-500/30" />
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 translate-x-1">
              <div className="w-2 h-2 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.3),0_2px_6px_rgba(0,0,0,0.4)] border border-violet-500/20" />
            </div>
          </div>
        </div>
      )}
      
      <div className="relative">
        {children}
      </div>
      
      {showAddButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddClick?.();
          }}
          className="absolute -bottom-1 -right-1 w-7 h-7 bg-background border-2 border-background rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all z-10 group"
        >
          <div className="w-6 h-6 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 rounded-full flex items-center justify-center shadow-[0_0_12px_rgba(139,92,246,0.5)] group-hover:shadow-[0_0_20px_rgba(139,92,246,0.7)] transition-shadow">
            <span className="text-white text-sm font-bold drop-shadow-sm">+</span>
          </div>
        </button>
      )}
    </div>
  );
};

export default StatusRing;