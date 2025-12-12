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
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="relative">
            {/* Premium status bubble with glassmorphism */}
            <div className="bg-black/85 backdrop-blur-xl text-white px-3 py-2 rounded-2xl text-xs overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.1)_inset] min-h-[32px] flex items-center justify-center min-w-[80px] max-w-[120px]">
              <div className="flex items-center gap-1.5 justify-center">
                {emoji && <span className="shrink-0 text-sm">{emoji}</span>}
                <div className="overflow-hidden flex-1 text-center">
                  <div className="animate-marquee whitespace-nowrap inline-block font-medium">
                    {statusText}
                    {statusText.length > 12 && <span className="ml-6">{statusText}</span>}
                  </div>
                </div>
              </div>
            </div>
            {/* Speech bubble connector dots */}
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2">
              <div className="w-2.5 h-2.5 bg-black/85 backdrop-blur-xl rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)]"></div>
            </div>
            <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 translate-x-0.5">
              <div className="w-1.5 h-1.5 bg-black/85 backdrop-blur-xl rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.25)]"></div>
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
          className="absolute -bottom-1 -right-1 w-7 h-7 bg-background border-2 border-background rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-10"
        >
          <div className="w-6 h-6 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-inner">
            <span className="text-primary-foreground text-sm font-bold">+</span>
          </div>
        </button>
      )}
    </div>
  );
};

export default StatusRing;