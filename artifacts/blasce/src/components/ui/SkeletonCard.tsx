export function SkeletonCard() {
  return (
    <div className="w-full rounded-xl overflow-hidden bg-secondary animate-pulse">
      <div className="aspect-[2/3] bg-white/5 relative">
        <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-white/5 to-transparent" />
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonCarouselRow() {
  return (
    <div className="py-4 px-4 md:px-8">
      <div className="h-7 w-44 bg-white/8 rounded-lg mb-5 animate-pulse" />
      <div className="flex gap-3 md:gap-5 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex-[0_0_42%] sm:flex-[0_0_30%] md:flex-[0_0_22%] lg:flex-[0_0_17%] xl:flex-[0_0_14%]"
          >
            <SkeletonCard />
          </div>
        ))}
      </div>
    </div>
  );
}
