import { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";

interface TooltipProps {
  title: string;
  description: string;
  formula?: string;
  interpretation: string;
}

export function Tooltip({ title, description, formula, interpretation }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      let top = triggerRect.bottom + 8;
      let left = triggerRect.left - tooltipRect.width / 2 + triggerRect.width / 2;
      
      // 화면 오른쪽 넘침 방지
      if (left + tooltipRect.width > window.innerWidth - 16) {
        left = window.innerWidth - tooltipRect.width - 16;
      }
      
      // 화면 왼쪽 넘침 방지
      if (left < 16) {
        left = 16;
      }
      
      // 화면 아래 넘침 방지
      if (top + tooltipRect.height > window.innerHeight - 16) {
        top = triggerRect.top - tooltipRect.height - 8;
      }
      
      setPosition({ top, left });
    }
  }, [isVisible]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsVisible(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        triggerRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible]);

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        onClick={(e) => {
          e.preventDefault();
          setIsVisible(!isVisible);
        }}
        aria-label={`${title} 정보`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-50 w-80 p-4 rounded-lg bg-[#0a1628] border border-primary/30 shadow-xl animate-in fade-in-0 zoom-in-95 duration-200"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
          role="tooltip"
        >
          <div className="space-y-2">
            <div className="font-semibold text-sm text-primary">{title}</div>
            <div className="text-sm text-foreground leading-relaxed">{description}</div>
            {formula && (
              <div className="text-xs text-muted-foreground font-mono bg-secondary/50 px-2 py-1 rounded">
                {formula}
              </div>
            )}
            <div className="text-xs text-accent pt-1 border-t border-border">
              {interpretation}
            </div>
          </div>
          <div
            className="absolute w-2 h-2 bg-[#0a1628] border-l border-t border-primary/30 transform rotate-45"
            style={{
              top: position.top > 100 ? "-4px" : "auto",
              bottom: position.top <= 100 ? "-4px" : "auto",
              left: "50%",
              marginLeft: "-4px",
            }}
          />
        </div>
      )}
    </div>
  );
}
