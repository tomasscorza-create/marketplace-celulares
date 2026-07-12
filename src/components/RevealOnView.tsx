import type { CSSProperties, ReactNode } from "react";

import { createContext, useContext, useEffect, useRef, useState } from "react";

type RevealOnViewProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  rootMargin?: string;
  style?: CSSProperties;
  threshold?: number;
};

export function RevealOnView({
  children,
  className,
  delayMs = 0,
  rootMargin = "0px 0px -10% 0px",
  style,
  threshold = 0.14,
}: RevealOnViewProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const rootElement = rootRef.current;

    if (!rootElement || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      },
    );

    observer.observe(rootElement);

    return () => {
      observer.disconnect();
    };
  }, [prefersReducedMotion, rootMargin, threshold]);

  return (
    <div
      className={[
        "reveal-on-scroll",
        isVisible ? "is-visible" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      ref={rootRef}
      style={{
        ...style,
        ["--reveal-delay" as string]: `${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}

const RevealSequenceContext = createContext<{ isVisible: boolean } | null>(null);

type RevealSequenceGroupProps = {
  children: ReactNode;
  className?: string;
  rootMargin?: string;
  style?: CSSProperties;
  threshold?: number;
};

export function RevealSequenceGroup({
  children,
  className,
  rootMargin = "0px 0px -12% 0px",
  style,
  threshold = 0.2,
}: RevealSequenceGroupProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const rootElement = rootRef.current;

    if (!rootElement || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      },
    );

    observer.observe(rootElement);

    return () => {
      observer.disconnect();
    };
  }, [prefersReducedMotion, rootMargin, threshold]);

  return (
    <RevealSequenceContext.Provider value={{ isVisible }}>
      <div className={className} ref={rootRef} style={style}>
        {children}
      </div>
    </RevealSequenceContext.Provider>
  );
}

type RevealSequenceItemProps = {
  children: ReactNode;
  className?: string;
  index: number;
  stepMs?: number;
  style?: CSSProperties;
};

export function RevealSequenceItem({
  children,
  className,
  index,
  stepMs = 72,
  style,
}: RevealSequenceItemProps) {
  const context = useContext(RevealSequenceContext);
  const isVisible = context?.isVisible ?? true;

  return (
    <div
      className={[
        "reveal-on-scroll",
        isVisible ? "is-visible" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        ...style,
        ["--reveal-delay" as string]: `${index * stepMs}ms`,
      }}
    >
      {children}
    </div>
  );
}
