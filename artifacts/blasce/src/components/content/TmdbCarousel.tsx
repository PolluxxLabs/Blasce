import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { TmdbCard } from "./TmdbCard";
import type { TMDBTrendingItem } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

interface TmdbCarouselProps {
  title: string;
  items: TMDBTrendingItem[];
  className?: string;
}

export function TmdbCarousel({ title, items, className }: TmdbCarouselProps) {
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
        <h2 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">{title}</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={scrollPrev}
            disabled={prevDisabled}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/12 disabled:opacity-25 disabled:cursor-not-allowed transition-colors text-white border border-white/8"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={scrollNext}
            disabled={nextDisabled}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/12 disabled:opacity-25 disabled:cursor-not-allowed transition-colors text-white border border-white/8"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden px-4 md:px-8" ref={emblaRef}>
        <div className="flex gap-3 md:gap-5">
          {items.map((item, index) => (
            <div key={`${item.media_type}-${item.id}`} className="flex-[0_0_42%] sm:flex-[0_0_30%] md:flex-[0_0_22%] lg:flex-[0_0_17%] xl:flex-[0_0_14%] min-w-0">
              <TmdbCard item={item} index={index} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
