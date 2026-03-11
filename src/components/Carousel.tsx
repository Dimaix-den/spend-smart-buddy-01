// components/Carousel.tsx
import { useState, useRef, useEffect } from "react";

interface CarouselProps {
  children: React.ReactNode;
  className?: string;
  showDots?: boolean;
}

const DEAD_ZONE = 12;
const SWIPE_THRESHOLD = 60;
const GAP_PX = 12;

export default function Carousel({
  children,
  className = "",
  showDots = true,
}: CarouselProps) {
  const items = Array.isArray(children) ? children : [children];
  const [index, setIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const hasLockedDirection = useRef(false);
  const isHorizontalGesture = useRef(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    setIsDragging(true);
    hasLockedDirection.current = false;
    isHorizontalGesture.current = false;
    setDragOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const t = e.touches[0];
    const deltaX = t.clientX - touchStartX.current;
    const deltaY = t.clientY - touchStartY.current;

    if (
      !hasLockedDirection.current &&
      Math.abs(deltaX) < DEAD_ZONE &&
      Math.abs(deltaY) < DEAD_ZONE
    ) {
      return;
    }

    if (!hasLockedDirection.current) {
      hasLockedDirection.current = true;
      isHorizontalGesture.current = Math.abs(deltaX) > Math.abs(deltaY);
    }

    if (hasLockedDirection.current && !isHorizontalGesture.current) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    if (isHorizontalGesture.current) {
      e.preventDefault();
      setDragOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;

    let newIndex = index;

    if (dragOffset < -SWIPE_THRESHOLD && index < items.length - 1) {
      newIndex = index + 1;
    } else if (dragOffset > SWIPE_THRESHOLD && index > 0) {
      newIndex = index - 1;
    }

    setIndex(newIndex);
    setDragOffset(0);
    setIsDragging(false);
    hasLockedDirection.current = false;
    isHorizontalGesture.current = false;
  };

  const slideWidth = containerWidth;
  
  // Учитываем marginLeft второго слайда в базовом сдвиге
  const baseTranslateX = -index * (slideWidth + GAP_PX);
  const totalTranslateX = baseTranslateX + dragOffset;

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      style={{ touchAction: "pan-y" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`flex ${isDragging ? "" : "transition-transform duration-300"}`}
        style={{
          transform: `translateX(${totalTranslateX}px)`,
        }}
      >
        {items.map((child, i) => (
          <div
            key={i}
            className="flex-shrink-0"
            style={{
              width: slideWidth,
              marginLeft: i === 0 ? 0 : GAP_PX,
            }}
          >
            {child}
          </div>
        ))}
      </div>

      {showDots && items.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === i ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
