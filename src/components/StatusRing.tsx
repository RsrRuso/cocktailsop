import { ReactNode } from "react";

interface StatusRingProps {
  children: ReactNode;
  hasStatus: boolean;
  statusText?: string;
  emoji?: string;
  musicTrackName?: string;
  musicAlbumArt?: string;
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
  musicTrackName,
  musicAlbumArt,
  onAddClick,
  showAddButton = false,
  isNew = false,
  className = "" 
}: StatusRingProps) => {
  const hasContent = hasStatus && (statusText || musicTrackName);
  
  return (
    <div className={`relative inline-block ${className}`}>
      {/* New story white glow effect */}
      {isNew && (
        <div className="absolute -inset-1 rounded-full bg-white/40 animate-pulse blur-sm" />
      )}
      
      {hasContent && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10 pointer-events-none animate-fade-in">
          <div className="relative group">
            {/* Compact black & white status bubble with shimmer */}
            <div className="relative bg-black text-white px-3 py-1.5 rounded-full text-[10px] overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.25)] min-w-[60px] max-w-[130px]">
              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              
              <div className="relative flex items-center gap-1.5 justify-center">
                {/* Music album art if available */}
                {musicTrackName && (
                  <div className="w-4 h-4 rounded-sm overflow-hidden flex-shrink-0 ring-1 ring-white/20">
                    {musicAlbumArt ? (
                      <img src={musicAlbumArt} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/20 flex items-center justify-center">
                        <span className="text-[8px]">🎵</span>
                      </div>
                    )}
                  </div>
                )}
                
                {emoji && !musicTrackName && <span className="shrink-0 text-sm">{emoji}</span>}
                
                <div className="overflow-hidden flex-1 text-center">
                  <div className="animate-marquee whitespace-nowrap inline-block font-medium tracking-wide">
                    {/* Show both music and status text */}
                    {musicTrackName && statusText ? (
                      <>
                        {musicTrackName} {emoji && <span>{emoji}</span>} {statusText}
                        <span className="ml-6">{musicTrackName} {emoji && <span>{emoji}</span>} {statusText}</span>
                      </>
                    ) : musicTrackName ? (
                      <>
                        {musicTrackName}
                        {musicTrackName.length > 10 && <span className="ml-6">{musicTrackName}</span>}
                      </>
                    ) : statusText ? (
                      <>
                        {statusText}
                        {statusText.length > 10 && <span className="ml-6">{statusText}</span>}
                      </>
                    ) : null}
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