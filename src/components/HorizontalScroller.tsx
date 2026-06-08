import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode
} from "react";
import { cn } from "../lib/formatters";

type HorizontalScrollerProps = {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  contentClassName?: string;
  scrollStep?: number;
  ariaLabel?: string;
  showControls?: boolean;
};

export function HorizontalScroller({
  children,
  className,
  viewportClassName,
  contentClassName,
  scrollStep = 420,
  ariaLabel = "가로 콘텐츠 이동",
  showControls = true
}: HorizontalScrollerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    pointerId: 0,
    startX: 0,
    scrollLeft: 0
  });
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const updateScrollState = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth;
    setCanScrollLeft(viewport.scrollLeft > 2);
    setCanScrollRight(maxScrollLeft > 2 && viewport.scrollLeft < maxScrollLeft - 2);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    updateScrollState();
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateScrollState) : null;
    resizeObserver?.observe(viewport);
    window.addEventListener("resize", updateScrollState);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const move = (direction: -1 | 1) => {
    viewportRef.current?.scrollBy({
      left: direction * scrollStep,
      behavior: "smooth"
    });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: viewport.scrollLeft
    };
    setIsDragging(true);
    viewport.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport || !dragRef.current.active) return;

    const deltaX = event.clientX - dragRef.current.startX;
    if (Math.abs(deltaX) > 3) {
      event.preventDefault();
    }
    viewport.scrollLeft = dragRef.current.scrollLeft - deltaX;
  };

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (viewport && dragRef.current.active && dragRef.current.pointerId === event.pointerId) {
      viewport.releasePointerCapture?.(event.pointerId);
    }
    dragRef.current.active = false;
    setIsDragging(false);
  };

  const hasControls = showControls && (canScrollLeft || canScrollRight);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={viewportRef}
        aria-label={ariaLabel}
        onScroll={updateScrollState}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onPointerLeave={(event) => {
          if (dragRef.current.active) stopDragging(event);
        }}
        className={cn(
          "scrollbar-none overflow-x-auto scroll-smooth",
          isDragging ? "cursor-grabbing select-none" : "cursor-grab",
          viewportClassName
        )}
        style={{ touchAction: "pan-y" }}
      >
        <div className={cn("w-max min-w-full", contentClassName)}>{children}</div>
      </div>

      {hasControls ? (
        <>
          <button
            type="button"
            aria-label="왼쪽으로 이동"
            title="왼쪽으로 이동"
            onClick={() => move(-1)}
            disabled={!canScrollLeft}
            className={cn(
              "absolute left-2 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-radar-line bg-white/95 text-slate-700 shadow-card transition hover:border-blue-300 hover:bg-blue-50 disabled:pointer-events-none disabled:opacity-0 dark:bg-slate-900/95 dark:text-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="오른쪽으로 이동"
            title="오른쪽으로 이동"
            onClick={() => move(1)}
            disabled={!canScrollRight}
            className={cn(
              "absolute right-2 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center rounded-full border border-radar-line bg-white/95 text-slate-700 shadow-card transition hover:border-blue-300 hover:bg-blue-50 disabled:pointer-events-none disabled:opacity-0 dark:bg-slate-900/95 dark:text-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <ChevronRight size={18} />
          </button>
        </>
      ) : null}
    </div>
  );
}
