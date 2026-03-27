import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { TmdbCard } from "./TmdbCard";
import type { TMDBTrendingItem } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

interface TmdbCarouselProps {
  title: string;
  items: TMDBTrendingItem[];
  showRanks?: boolean;
  className?: string;
}

export function TmdbCarousel({ title, items, showRanks = false, className }: TmdbCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });

  const [prevDisabled, setPrevDisabled] = useState(true);
  const [nextDisabled, setNextDisabled] = useState(true);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback((api: typeof emblaApi) => {
    if (!api) return;
    setPrevDisabled(!api.canScrollPrev());
    setNextDisabled(!api.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on("reInit", onSelect).on("select", onSelect);
  }, [emblaApi, onSelect]);

  if (!items.length) return null;

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center justify-between px-4 md:px-8 mb-5">
        <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">{title}</h2>
        <div className="flex items-center gap-2.5">
          <button
            onClick={scrollPrev}
            disabled={prevDisabled}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-white border border-white/6 hover:border-white/12"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={scrollNext}
            disabled={nextDisabled}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-white border border-white/6 hover:border-white/12"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden px-4 md:px-8" ref={emblaRef}>
        <div className="flex gap-3 md:gap-4">
          {items.map((item, index) => (
            <div key={`${item.media_type}-${item.id}`} className="flex-[0_0_42%] sm:flex-[0_0_30%] md:flex-[0_0_22%] lg:flex-[0_0_17%] xl:flex-[0_0_14%] min-w-0">
              <TmdbCard item={item} index={index} rank={showRanks ? index + 1 : undefined} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
