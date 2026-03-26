import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import type { Content } from "@workspace/api-client-react";
import { ContentCard } from "./ContentCard";
import { cn } from "@/lib/utils";

interface ContentCarouselProps {
  title: string;
  items: Content[];
  viewAllHref?: string;
  className?: string;
}

export function ContentCarousel({ title, items, viewAllHref, className }: ContentCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });

  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback((api: typeof emblaApi) => {
    if (!api) return;
    setPrevBtnDisabled(!api.canScrollPrev());
    setNextBtnDisabled(!api.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on("reInit", onSelect).on("select", onSelect);
  }, [emblaApi, onSelect]);

  if (!items || items.length === 0) return null;

  return (
    <div className={cn("relative", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-8 mb-5">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">{title}</h2>
        <div className="flex items-center gap-3">
          {viewAllHref && (
            <Link href={viewAllHref} className="text-sm text-primary hover:text-primary/80 font-semibold transition-colors mr-2">
              See all
            </Link>
          )}
          <button
            onClick={scrollPrev}
            disabled={prevBtnDisabled}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/12 disabled:opacity-25 disabled:cursor-not-allowed transition-colors text-white border border-white/8"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={scrollNext}
            disabled={nextBtnDisabled}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white/6 hover:bg-white/12 disabled:opacity-25 disabled:cursor-not-allowed transition-colors text-white border border-white/8"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden px-4 md:px-8" ref={emblaRef}>
        <div className="flex gap-3 md:gap-5">
          {items.map((item, index) => (
            <div key={item.id} className="flex-[0_0_42%] sm:flex-[0_0_30%] md:flex-[0_0_22%] lg:flex-[0_0_17%] xl:flex-[0_0_14%] min-w-0">
              <ContentCard content={item} index={index} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
