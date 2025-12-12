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
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="relative">
            {/* Compact white status bubble */}
            <div className="bg-white text-gray-800 px-2.5 py-1 rounded-full text-[10px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.15)] min-w-[50px] max-w-[100px] border border-gray-100">
              <div className="flex items-center gap-1 justify-center">
                {emoji && <span className="shrink-0 text-xs">{emoji}</span>}
                <div className="overflow-hidden flex-1 text-center">
                  <div className="animate-marquee whitespace-nowrap inline-block font-medium">
                    {statusText}
                    {statusText.length > 8 && <span className="ml-4">{statusText}</span>}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Speech bubble connector */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
              <div className="w-2 h-2 bg-white rounded-full shadow-sm border border-gray-100" />
            </div>
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 translate-x-0.5">
              <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm border border-gray-100" />
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
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all z-10"
        >
          <span className="text-primary text-xs font-bold">+</span>
        </button>
      )}
    </div>
  );
};

export default StatusRing;