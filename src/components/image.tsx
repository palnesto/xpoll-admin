import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface ImageCarouselProps {
  images: string[];
  autoPlayInterval?: number;
  initialAutoPlay?: boolean;
}

export function ImageCarousel({
  images,
  autoPlayInterval = 5000,
  initialAutoPlay = false,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(initialAutoPlay);
  const [isFading, setIsFading] = useState(false);

  const nextSlide = useCallback(() => {
    setIsFading(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev === images?.length - 1 ? 0 : prev + 1));
      setIsFading(false);
    }, 200);
  }, [images, setCurrentIndex, setIsFading]);

  const prevSlide = useCallback(() => {
    setIsFading(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev === 0 ? images?.length - 1 : prev - 1));
      setIsFading(false);
    }, 200);
  }, [images, setCurrentIndex, setIsFading]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(nextSlide, autoPlayInterval);
    return () => clearInterval(interval);
  }, [isPlaying, autoPlayInterval, nextSlide]);

  if (!images || images?.length === 0) return null;

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        <img
          src={`${images[currentIndex]}?auto=format&fit=crop&w=1600&h=900`}
          alt={`Slide ${currentIndex + 1}`}
          className={`w-full h-full object-contain transition-opacity duration-200 ${
            isFading ? "opacity-0" : "opacity-100"
          }`}
        />

        <button
          type="button"
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors focus:outline-none focus:ring-2 focus:ring-white/75"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <button
          type="button"
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors focus:outline-none focus:ring-2 focus:ring-white/75"
          aria-label="Next image"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-center gap-2">
              {images?.map((_, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/75 ${
                    index === currentIndex
                      ? "bg-white scale-125"
                      : "bg-white/50 hover:bg-white/75"
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                  aria-current={index === currentIndex ? "true" : "false"}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors focus:outline-none focus:ring-2 focus:ring-white/75 ml-4"
              aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>

        <div className="absolute top-4 right-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
          {currentIndex + 1} / {images?.length}
        </div>
      </div>
    </div>
  );
}
