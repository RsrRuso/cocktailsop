import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  showZoomIcon?: boolean;
  objectFit?: 'contain' | 'cover';
}

export const ZoomableImage = ({ 
  src, 
  alt, 
  className,
  containerClassName,
  showZoomIcon = true,
  objectFit = 'contain'
}: ZoomableImageProps) => {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <>
      <div 
        className={cn(
          "relative cursor-pointer group overflow-hidden",
          containerClassName
        )}
        onClick={() => setIsZoomed(true)}
      >
        <img 
          src={src} 
          alt={alt} 
          className={cn(
            "transition-transform group-hover:scale-105",
            objectFit === 'contain' ? 'object-contain' : 'object-cover',
            className
          )}
        />
        {showZoomIcon && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
        )}
      </div>

      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <div className="relative bg-black">
            <img 
              src={src} 
              alt={alt} 
              className="w-full h-auto max-h-[90vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
