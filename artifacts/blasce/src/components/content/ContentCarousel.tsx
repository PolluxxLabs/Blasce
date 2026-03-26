import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Content } from "@workspace/api-client-react";
import { ContentCard } from "./ContentCard";
import { cn } from "@/lib/utils";

interface ContentCarouselProps {
  title: string;
  items: Content[];
  className?: string;
}

export function ContentCarousel({ title, items, className }: ContentCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: true,
  });

  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback((emblaApi: any) => {
    setPrevBtnDisabled(!emblaApi.canScrollPrev());
    setNextBtnDisabled(!emblaApi.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on("reInit", onSelect).on("select", onSelect);
  }, [emblaApi, onSelect]);

  if (!items || items.length === 0) return null;

  return (
    <div className={cn("relative py-6", className)}>
      <div className="flex items-end justify-between px-4 md:px-8 mb-6">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-white">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={scrollPrev}
            disabled={prevBtnDisabled}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={scrollNext}
            disabled={nextBtnDisabled}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden px-4 md:px-8" ref={emblaRef}>
        <div className="flex gap-4 md:gap-6 -ml-4 pl-4">
          {items.map((item, index) => (
            <div key={item.id} className="flex-[0_0_40%] sm:flex-[0_0_28%] md:flex-[0_0_22%] lg:flex-[0_0_16%] min-w-0">
              <ContentCard content={item} index={index} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
