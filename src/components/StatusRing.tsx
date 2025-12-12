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
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none animate-fade-in">
          <div className="relative group">
            {/* Compact black & white status bubble with shimmer */}
            <div className="relative bg-black text-white px-3 py-1.5 rounded-full text-[10px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.25)] min-w-[60px] max-w-[110px]">
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              
              <div className="relative flex items-center gap-1.5 justify-center">
                {emoji && <span className="shrink-0 text-sm">{emoji}</span>}
                <div className="overflow-hidden flex-1 text-center">
                  <div className="animate-marquee whitespace-nowrap inline-block font-medium tracking-wide">
                    {statusText}
                    {statusText.length > 10 && <span className="ml-6">{statusText}</span>}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Speech bubble connector dots */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
              <div className="w-2 h-2 bg-black rounded-full shadow-md" />
            </div>
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 translate-x-0.5">
              <div className="w-1.5 h-1.5 bg-black rounded-full shadow-sm" />
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
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-black border-2 border-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform z-10"
        >
          <span className="text-white text-xs font-bold">+</span>
        </button>
      )}
    </div>
  );
};

export default StatusRing;