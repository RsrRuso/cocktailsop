import { cn } from "@/lib/utils";

// Enhanced skeleton with shimmer animation for instant perceived speed
export const SkeletonShimmer = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/50",
        "before:absolute before:inset-0",
        "before:-translate-x-full",
        "before:animate-[shimmer_1.5s_infinite]",
        "before:bg-gradient-to-r",
        "before:from-transparent before:via-white/10 before:to-transparent",
        className
      )}
      {...props}
    />
  );
};

// Feed post skeleton with shimmer
export const FeedPostSkeleton = () => (
  <div className="bg-card rounded-xl p-4 space-y-3 border border-border/20">
    <div className="flex items-center gap-3">
      <SkeletonShimmer className="w-10 h-10 rounded-full" />
      <div className="space-y-1.5 flex-1">
        <SkeletonShimmer className="w-28 h-4" />
        <SkeletonShimmer className="w-20 h-3" />
      </div>
    </div>
    <SkeletonShimmer className="w-full h-52 rounded-lg" />
    <div className="flex gap-4 pt-1">
      <SkeletonShimmer className="w-14 h-5 rounded-full" />
      <SkeletonShimmer className="w-14 h-5 rounded-full" />
      <SkeletonShimmer className="w-14 h-5 rounded-full" />
    </div>
  </div>
);

// Stories skeleton with shimmer
export const StoriesSkeleton = () => (
  <div className="flex gap-3 px-4 py-2 overflow-hidden">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex flex-col items-center gap-1.5 min-w-fit">
        <SkeletonShimmer className="w-[72px] h-[72px] rounded-full" />
        <SkeletonShimmer className="w-12 h-2.5 rounded" />
      </div>
    ))}
  </div>
);

// Full feed skeleton
export const FeedSkeleton = () => (
  <div className="space-y-4 px-4">
    {[...Array(2)].map((_, i) => (
      <FeedPostSkeleton key={i} />
    ))}
  </div>
);

// Message item skeleton
export const MessageSkeleton = () => (
  <div className="flex items-center gap-3 p-3">
    <SkeletonShimmer className="w-12 h-12 rounded-full" />
    <div className="flex-1 space-y-2">
      <SkeletonShimmer className="w-32 h-4" />
      <SkeletonShimmer className="w-48 h-3" />
    </div>
    <SkeletonShimmer className="w-10 h-3" />
  </div>
);

// Email item skeleton
export const EmailSkeleton = () => (
  <div className="p-4 border-b border-border/20">
    <div className="flex items-start gap-3">
      <SkeletonShimmer className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex justify-between">
          <SkeletonShimmer className="w-28 h-4" />
          <SkeletonShimmer className="w-12 h-3" />
        </div>
        <SkeletonShimmer className="w-full h-4" />
        <SkeletonShimmer className="w-3/4 h-3" />
      </div>
    </div>
  </div>
);

// Profile skeleton
export const ProfileSkeleton = () => (
  <div className="p-4 space-y-4">
    <div className="flex items-center gap-4">
      <SkeletonShimmer className="w-20 h-20 rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonShimmer className="w-32 h-5" />
        <SkeletonShimmer className="w-24 h-4" />
        <SkeletonShimmer className="w-48 h-3" />
      </div>
    </div>
    <div className="flex gap-6 justify-center">
      <div className="text-center space-y-1">
        <SkeletonShimmer className="w-10 h-5 mx-auto" />
        <SkeletonShimmer className="w-12 h-3 mx-auto" />
      </div>
      <div className="text-center space-y-1">
        <SkeletonShimmer className="w-10 h-5 mx-auto" />
        <SkeletonShimmer className="w-12 h-3 mx-auto" />
      </div>
      <div className="text-center space-y-1">
        <SkeletonShimmer className="w-10 h-5 mx-auto" />
        <SkeletonShimmer className="w-12 h-3 mx-auto" />
      </div>
    </div>
  </div>
);
