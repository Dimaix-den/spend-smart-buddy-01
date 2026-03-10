// components/Carousel.tsx
import { useState, useRef } from "react";

interface CarouselProps {
  children: React.ReactNode;
  className?: string;
  showDots?: boolean;
}

const DEAD_ZONE = 12; // px — минимальное движение, чтобы вообще начать свайп
const SWIPE_THRESHOLD = 60; // px — порог смены слайда (чуть больше, чтобы не дёргалось)

export default function Carousel({ children, className = "", showDots = true }: CarouselProps) {
  const items = Array.isArray(children) ? children : [children];
  const [index, setIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const hasLockedDirection = useRef(false);
  const isHorizontalGesture = useRef(false);

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

    // 1. Мёртвая зона: пока меньше DEAD_ZONE по обеим осям — вообще ничего не делаем
    if (
      !hasLockedDirection.current &&
      Math.abs(deltaX) < DEAD_ZONE &&
      Math.abs(deltaY) < DEAD_ZONE
    ) {
      return;
    }

    // 2. Как только вышли из мёртвой зоны — один раз определяем направление
    if (!hasLockedDirection.current) {
      hasLockedDirection.current = true;
      isHorizontalGesture.current = Math.abs(deltaX) > Math.abs(deltaY);
    }

    // 3. Вертикальный жест — отдаём странице
    if (hasLockedDirection.current && !isHorizontalGesture.current) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    // 4. Горизонтальный свайп — блокируем вертикальный скролл и двигаем слайды за пальцем
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

  const baseTranslate = -index * 100;
  const dragTranslate =
    (dragOffset / (typeof window !== "undefined" ? window.innerWidth || 1 : 1)) * 100;
  const totalTranslate = baseTranslate + dragTranslate;

  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{ touchAction: "pan-y" }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`flex ${isDragging ? "" : "transition-transform duration-300"}`}
        style={{ transform: `translateX(${totalTranslate}%)` }}
      >
        {items.map((child, i) => (
          <div
            key={i}
            className={`w-full flex-shrink-0 ${i !== items.length - 1 ? "pr-3" : ""}`}
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
    
