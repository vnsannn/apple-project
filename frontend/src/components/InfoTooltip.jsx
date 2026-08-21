import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CircleQuestionMark } from "lucide-react";

function InfoTooltip({ label = "More information", children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    placement: "top",
  });

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const tooltipId = useId();

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) {
      return;
    }

    const trigger = triggerRef.current.getBoundingClientRect();
    const viewportPadding = 12;
    const tooltipWidth = Math.min(260, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      window.innerWidth - tooltipWidth - viewportPadding,
      Math.max(viewportPadding, trigger.right - tooltipWidth),
    );

    const placement = trigger.top < 170 ? "bottom" : "top";

    setPosition({
      top: placement === "bottom" ? trigger.bottom + 10 : trigger.top - 10,
      left,
      placement,
    });
  }, []);

  function toggleTooltip() {
    if (!isOpen) {
      updatePosition();
    }

    setIsOpen((current) => !current);
  }

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleOutsideClick(event) {
      const clickedTrigger = containerRef.current?.contains(event.target);
      const clickedTooltip = tooltipRef.current?.contains(event.target);

      if (!clickedTrigger && !clickedTooltip) {
        setIsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    updatePosition();

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  return (
    <span className="info-tooltip" ref={containerRef}>
      <button
        ref={triggerRef}
        className="info-tooltip-trigger"
        type="button"
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={tooltipId}
        onClick={toggleTooltip}
      >
        <CircleQuestionMark size={16} strokeWidth={2} />
      </button>

      {isOpen &&
        createPortal(
          <span
            ref={tooltipRef}
            id={tooltipId}
            className={`info-tooltip-content tooltip-${position.placement}`}
            role="tooltip"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
            }}
          >
            {children}
          </span>,
          document.body,
        )}
    </span>
  );
}

export default InfoTooltip;
