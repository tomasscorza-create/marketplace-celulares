import type { CSSProperties } from "react";

import { useEffect, useState } from "react";

type ProgressiveImageProps = {
  alt: string;
  className?: string;
  decoding?: "async" | "auto" | "sync";
  fetchPriority?: "auto" | "high" | "low";
  imageClassName?: string;
  loading?: "eager" | "lazy";
  onLoad?: () => void;
  src: string;
  style?: CSSProperties;
};

export function ProgressiveImage({
  alt,
  className,
  decoding = "async",
  fetchPriority = "auto",
  imageClassName,
  loading = "lazy",
  onLoad,
  src,
  style,
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
  }, [src]);

  return (
    <div className={["relative overflow-hidden", className].filter(Boolean).join(" ")}>
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-0 [border-radius:inherit] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.78),rgba(246,240,231,0.58)_38%,rgba(230,238,248,0.42)_100%)] transition-opacity duration-500 ease-out",
          isLoaded ? "opacity-0" : "opacity-100",
        ].join(" ")}
      />
      <img
        alt={alt}
        className={[
          "h-full w-full transition-[opacity,filter,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,filter,transform]",
          isLoaded ? "opacity-100 scale-100 blur-0" : "opacity-100 scale-[1.018] blur-[14px]",
          imageClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        decoding={decoding}
        fetchPriority={fetchPriority}
        loading={loading}
        onLoad={() => {
          setIsLoaded(true);
          onLoad?.();
        }}
        src={src}
        style={style}
      />
    </div>
  );
}
