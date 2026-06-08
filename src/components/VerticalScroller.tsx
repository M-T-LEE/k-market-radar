import { ChevronDown, ChevronUp } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode
} from "react";
import { cn } from "../lib/formatters";

type VerticalScrollerProps = {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  contentClassName?: string;
  scrollStep?: number;
  ariaLabel?: string;
  showControls?: boolean;
};

export function VerticalScroller({
  children,
  className,
  viewportClassName,
  contentClassName,
  scrollStep = 260,
  ariaLabel = "세로 콘텐츠 이동",
  showControls = true
}: VerticalScrollerProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    pointerId: 0,
    startY: 0,
    scrollTop: 0
  });
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const updateScrollState = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const maxScrollTop = viewport.scrollHeight - viewport.clientHeight;
    setCanScrollUp(viewport.scrollTop > 2);
    setCanScrollDown(maxScrollTop > 2 && viewport.scrollTop < maxScrollTop - 2);
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    updateScrollState();
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateScrollState) : null;
    resizeObserver?.observe(viewport);
    if (viewport.firstElementChild) {
      resizeObserver?.observe(viewport.firstElementChild);
    }
    window.addEventListener("resize", updateScrollState);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  const move = (direction: -1 | 1) => {
    viewportRef.current?.scrollBy({
      top: direction * scrollStep,
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
      startY: event.clientY,
      scrollTop: viewport.scrollTop
    };
    setIsDragging(true);
    viewport.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport || !dragRef.current.active) return;

    const deltaY = event.clientY - dragRef.current.startY;
    if (Math.abs(deltaY) > 3) {
      event.preventDefault();
    }
    viewport.scrollTop = dragRef.current.scrollTop - deltaY;
  };

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (viewport && dragRef.current.active && dragRef.current.pointerId === event.pointerId) {
      viewport.releasePointerCapture?.(event.pointerId);
    }
    dragRef.current.active = false;
    setIsDragging(false);
  };

  const hasControls = showControls && (canScrollUp || canScrollDown);

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
          "scrollbar-none h-full overflow-y-auto scroll-smooth",
          isDragging ? "cursor-grabbing select-none" : "cursor-grab",
          viewportClassName
        )}
        style={{ touchAction: "pan-x" }}
      >
        <div className={cn("min-h-full", contentClassName)}>{children}</div>
      </div>

      {hasControls ? (
        <>
          <button
            type="button"
            aria-label="위로 이동"
            title="위로 이동"
            onClick={() => move(-1)}
            disabled={!canScrollUp}
            className="absolute left-1/2 top-2 z-20 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-radar-line bg-white/95 text-slate-700 shadow-card transition hover:border-blue-300 hover:bg-blue-50 disabled:pointer-events-none disabled:opacity-0 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronUp size={18} />
          </button>
          <button
            type="button"
            aria-label="아래로 이동"
            title="아래로 이동"
            onClick={() => move(1)}
            disabled={!canScrollDown}
            className="absolute bottom-2 left-1/2 z-20 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-radar-line bg-white/95 text-slate-700 shadow-card transition hover:border-blue-300 hover:bg-blue-50 disabled:pointer-events-none disabled:opacity-0 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <ChevronDown size={18} />
          </button>
        </>
      ) : null}
    </div>
  );
}
