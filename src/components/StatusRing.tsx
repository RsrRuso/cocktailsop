import { ReactNode } from "react";

interface StatusRingProps {
  children: ReactNode;
  hasStatus: boolean;
  statusText?: string;
  emoji?: string;
  onAddClick?: () => void;
  showAddButton?: boolean;
  className?: string;
}

const StatusRing = ({ 
  children, 
  hasStatus, 
  statusText,
  emoji,
  onAddClick,
  showAddButton = false,
  className = "" 
}: StatusRingProps) => {
  return (
    <div className={`relative inline-block ${className}`}>
      {hasStatus && statusText && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-10 pointer-events-none w-[100px]">
          <div className="relative">
            <div className="bg-muted/95 backdrop-blur-sm text-muted-foreground px-2 py-1.5 rounded-full text-[10px] overflow-hidden shadow-[0_0_12px_rgba(147,197,253,0.6)] min-h-[28px] flex items-center justify-center">
              <div className="flex items-center gap-1 justify-center">
                {emoji && <span className="shrink-0 text-[11px]">{emoji}</span>}
                <div className="overflow-hidden flex-1 text-center">
                  <div className="animate-marquee whitespace-nowrap inline-block">
                    {statusText}
                    {statusText.length > 15 && <span className="ml-6">{statusText}</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
              <div className="w-2 h-2 bg-muted/95 backdrop-blur-sm rounded-full shadow-[0_0_8px_rgba(147,197,253,0.5)]"></div>
            </div>
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 translate-x-0.5">
              <div className="w-1.5 h-1.5 bg-muted/95 backdrop-blur-sm rounded-full shadow-[0_0_6px_rgba(147,197,253,0.4)]"></div>
            </div>
          </div>
        </div>
      )}
      
      {children}
      
      {showAddButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddClick?.();
          }}
          className="absolute -bottom-1 -right-1 w-6 h-6 bg-background border-2 border-background rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform z-10"
        >
          <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground text-xs font-semibold">+</span>
          </div>
        </button>
      )}
    </div>
  );
};

export default StatusRing;
