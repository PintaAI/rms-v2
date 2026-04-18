"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";

interface Point {
  x: number;
  y: number;
}

interface PatternLockProps {
  /** Width of the pattern lock in pixels */
  width?: number;
  /** Height of the pattern lock in pixels */
  height?: number;
  /** Number of columns in the grid */
  cols?: number;
  /** Number of rows in the grid */
  rows?: number;
  /** External pattern to display (for read-only display) */
  pattern?: number[];
  /** Callback when pattern is completed */
  onPatternComplete?: (pattern: number[]) => void;
  /** Callback when pattern changes during drawing */
  onPatternChange?: (pattern: number[]) => void;
  /** External error state to show error styling */
  error?: boolean;
  /** Custom error color */
  errorColor?: string;
  /** Custom primary/accent color */
  primaryColor?: string;
  /** Custom inactive color */
  inactiveColor?: string;
  /** Delay in ms before auto-reset after completion */
  resetDelay?: number;
  /** Whether to auto-reset after completion */
  autoReset?: boolean;
  /** Whether the pattern lock is disabled */
  disabled?: boolean;
  /** Show pattern numbers for accessibility/debugging */
  showPatternNumbers?: boolean;
  /** Animate the pattern on mount (for display mode) */
  animatePattern?: boolean;
  /** Key to trigger re-animation when changed */
  animationKey?: number;
}

export function PatternLock({
  width = 300,
  height = 300,
  cols = 3,
  rows = 3,
  pattern: externalPattern,
  onPatternComplete,
  onPatternChange,
  error: externalError = false,
  errorColor = "#ef4444",
  primaryColor = "#3b82f6",
  inactiveColor = "#9ca3af",
  resetDelay = 1000,
  autoReset = true,
  disabled = false,
  showPatternNumbers = false,
  animatePattern = false,
  animationKey = 0,
}: PatternLockProps) {
  const [internalPattern, setInternalPattern] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mousePosition, setMousePosition] = useState<Point | null>(null);
  const [internalError, setInternalError] = useState(false);
  const [animatedPattern, setAnimatedPattern] = useState<number[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Animation effect for displaying pattern
  useEffect(() => {
    if (animatePattern && externalPattern && externalPattern.length > 0) {
      setAnimatedPattern([]);
      let index = 0;
      const interval = setInterval(() => {
        if (index < externalPattern.length) {
          setAnimatedPattern(externalPattern.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
        }
      }, 150); // 150ms per dot animation
      
      return () => clearInterval(interval);
    } else if (externalPattern) {
      setAnimatedPattern(externalPattern);
    } else {
      setAnimatedPattern([]);
    }
  }, [animatePattern, externalPattern, animationKey]);

  // Use animated pattern for display mode, internal pattern for interactive mode
  const pattern = externalPattern !== undefined ? animatedPattern : internalPattern;

  // Combine internal and external error states
  const hasError = externalError || internalError;

  // Configuration constants
  const config = useMemo(
    () => ({
      dotRadius: 20,
      hitRadius: 40,
      padding: 50,
      lineWidth: 4,
      innerDotRadius: 6,
      activeInnerDotRadius: 8,
      glowRadius: 5,
    }),
    []
  );

  // Calculate dot positions based on grid
  const dotPositions = useMemo<Point[]>(() => {
    const positions: Point[] = [];
    const { padding } = config;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;
    const xSpacing = availableWidth / (cols - 1);
    const ySpacing = availableHeight / (rows - 1);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        positions.push({
          x: padding + col * xSpacing,
          y: padding + row * ySpacing,
        });
      }
    }
    return positions;
  }, [width, height, cols, rows, config]);

  // Generate line segments from pattern
  const lineSegments = useMemo(() => {
    if (pattern.length < 2) return [];
    
    return pattern.slice(0, -1).map((_, index) => ({
      x1: dotPositions[pattern[index]].x,
      y1: dotPositions[pattern[index]].y,
      x2: dotPositions[pattern[index + 1]].x,
      y2: dotPositions[pattern[index + 1]].y,
    }));
  }, [pattern, dotPositions]);

  // Get current color based on state
  const getCurrentColor = useCallback(
    (isActive: boolean) => {
      if (hasError) return errorColor;
      if (isActive) return primaryColor;
      return inactiveColor;
    },
    [hasError, errorColor, primaryColor, inactiveColor]
  );

  // Convert screen coordinates to SVG local coordinates
  const screenToLocalPoint = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const svg = svgRef.current;
      if (!svg) return null;

      const rect = svg.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    []
  );

  // Find dot index at given position
  const findDotAtPosition = useCallback(
    (x: number, y: number): number => {
      for (let i = 0; i < dotPositions.length; i++) {
        const pos = dotPositions[i];
        const dx = pos.x - x;
        const dy = pos.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= config.hitRadius) {
          return i;
        }
      }
      return -1;
    },
    [dotPositions, config.hitRadius]
  );

  // Handle pointer down (mouse or touch start)
  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      e.preventDefault();

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const point = screenToLocalPoint(clientX, clientY);
      if (!point) return;

      const dotIndex = findDotAtPosition(point.x, point.y);
      if (dotIndex >= 0) {
        setIsDrawing(true);
        setInternalError(false);
        setMousePosition(point);
        const newPattern = [dotIndex];
        setInternalPattern(newPattern);
        onPatternChange?.(newPattern);
      }
    },
    [disabled, screenToLocalPoint, findDotAtPosition, onPatternChange]
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || disabled) return;
      e.preventDefault();

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const point = screenToLocalPoint(clientX, clientY);
      if (!point) return;

      setMousePosition(point);

      const dotIndex = findDotAtPosition(point.x, point.y);
      if (dotIndex >= 0 && !pattern.includes(dotIndex)) {
        const newPattern = [...pattern, dotIndex];
        setInternalPattern(newPattern);
        onPatternChange?.(newPattern);
      }
    },
    [isDrawing, disabled, screenToLocalPoint, findDotAtPosition, pattern, onPatternChange]
  );

  // Handle pointer up (end drawing)
  const handlePointerUp = useCallback(() => {
    if (!isDrawing) return;

    setIsDrawing(false);
    setMousePosition(null);

    if (pattern.length > 0) {
      onPatternComplete?.(pattern);

      if (autoReset) {
        setTimeout(() => {
          setInternalPattern([]);
        }, resetDelay);
      }
    }
  }, [isDrawing, pattern, onPatternComplete, autoReset, resetDelay]);

  // Handle pointer leave
  const handlePointerLeave = useCallback(() => {
    if (isDrawing) {
      handlePointerUp();
    }
  }, [isDrawing, handlePointerUp]);

  // Reset pattern programmatically
  const reset = useCallback(() => {
    setInternalPattern([]);
    setInternalError(false);
    setIsDrawing(false);
    setMousePosition(null);
  }, []);

  // Set error state programmatically
  const setError = useCallback((error: boolean) => {
    setInternalError(error);
  }, []);

  // Expose reset and setError via ref or useImperativeHandle if needed
  // For now, we'll just provide them as internal utilities

  // Calculate the active line from last dot to mouse position
  const activeLine = useMemo(() => {
    if (!isDrawing || pattern.length === 0 || !mousePosition) return null;
    
    const lastDot = dotPositions[pattern[pattern.length - 1]];
    if (!lastDot) return null;

    return {
      x1: lastDot.x,
      y1: lastDot.y,
      x2: mousePosition.x,
      y2: mousePosition.y,
    };
  }, [isDrawing, pattern, mousePosition, dotPositions]);

  // SVG event handlers
  const svgEvents = {
    onMouseDown: handlePointerDown,
    onMouseMove: handlePointerMove,
    onMouseUp: handlePointerUp,
    onMouseLeave: handlePointerLeave,
    onTouchStart: handlePointerDown,
    onTouchMove: handlePointerMove,
    onTouchEnd: handlePointerUp,
  };

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col items-center"
      role="application"
      aria-label="Pattern lock"
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={`touch-none select-none ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        aria-disabled={disabled}
        {...svgEvents}
      >
        {/* Background circle */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r={Math.min(width, height) / 2 - 20}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="text-muted opacity-30"
        />

        {/* Pattern lines */}
        {lineSegments.map((line, index) => (
          <line
            key={`line-${index}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={getCurrentColor(true)}
            strokeWidth={config.lineWidth}
            strokeLinecap="round"
            className="transition-colors duration-150"
          />
        ))}

        {/* Active drawing line */}
        {activeLine && (
          <line
            x1={activeLine.x1}
            y1={activeLine.y1}
            x2={activeLine.x2}
            y2={activeLine.y2}
            stroke={getCurrentColor(true)}
            strokeWidth={config.lineWidth}
            strokeLinecap="round"
            className="opacity-50"
          />
        )}

        {/* Dots */}
        {dotPositions.map((pos, index) => {
          const isActive = pattern.includes(index);
          const isLast = pattern[pattern.length - 1] === index;
          const color = getCurrentColor(isActive);

          return (
            <g key={`dot-${index}`} className="transition-all duration-150">
              {/* Invisible hit area for easier touch */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={config.hitRadius}
                fill="transparent"
                className="cursor-pointer"
              />
              
              {/* Outer ring */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={config.dotRadius}
                fill={isActive ? (hasError ? "#fef2f2" : "#eff6ff") : "transparent"}
                stroke={color}
                strokeWidth={2}
                className="transition-all duration-150"
              />
              
              {/* Inner dot */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isActive ? config.activeInnerDotRadius : config.innerDotRadius}
                fill={color}
                className="transition-all duration-150"
              />
              
              {/* Glow effect for last selected dot */}
              {isLast && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={config.dotRadius + config.glowRadius}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  className="animate-pulse"
                />
              )}

              {/* Pattern number for accessibility/debugging */}
              {showPatternNumbers && (
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fill={isActive ? color : inactiveColor}
                  className="pointer-events-none select-none"
                >
                  {index}
                </text>
              )}
            </g>
          );
        })}
      </svg>

    </div>
  );
}

export default PatternLock;