import type { CSSProperties, MouseEvent, ReactNode } from "react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getCatalogImageSrcSet,
  getOptimizedCatalogImageUrl,
} from "../lib/images/catalogImageUrl";

export type ProductCarouselImage = {
  alt: string;
  fallbackUrl?: string | null;
  url: string;
};

type ProductImageCarouselProps = {
  autoAdvance?: boolean;
  autoAdvanceDelay?: number;
  autoAdvanceMinImages?: number;
  buttonClassName?: string;
  className?: string;
  currentIndex?: number;
  emptyState?: ReactNode;
  imageClassName?: string;
  imageQuality?: number;
  imageSizes?: string;
  imageStyle?: CSSProperties;
  imageWidth?: number;
  images: ProductCarouselImage[];
  imageSrcSetWidths?: number[];
  maxImages?: number;
  onIndexChange?: (index: number) => void;
  onManualNavigation?: () => void;
  /**
   * Si es true, la imagen activa se carga con loading="eager" y
   * fetchPriority="high" para mejorar el LCP en cards above-the-fold.
   * Las imágenes previas (durante transición) y secundarias siguen lazy.
   */
  priority?: boolean;
};

type TransitionStage = "idle" | "prepare" | "active";

const CAROUSEL_TRANSITION_MS = 680;
const OPTIMIZED_IMAGE_FALLBACK_DELAY_MS = 5200;
const DEFAULT_EMPTY_STATE = (
  <div className="flex h-full min-h-[8rem] items-center justify-center px-4 py-6 text-center text-sm font-semibold text-stone-500">
    Imagen no disponible
  </div>
);

function moduloIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function detectReducedMotionPreference() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getUniqueImages(images: ProductCarouselImage[]) {
  const seenUrls = new Set<string>();

  return images.filter((image) => {
    if (!image.url || seenUrls.has(image.url)) {
      return false;
    }

    seenUrls.add(image.url);
    return true;
  });
}

export function ProductImageCarousel({
  autoAdvance = false,
  autoAdvanceDelay = 5000,
  autoAdvanceMinImages = 2,
  buttonClassName,
  className,
  currentIndex,
  emptyState = null,
  imageClassName,
  imageQuality = 72,
  imageSizes = "(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 25vw",
  imageSrcSetWidths = [320, 480, 640, 768],
  imageStyle,
  imageWidth = 640,
  images,
  maxImages,
  onIndexChange,
  onManualNavigation,
  priority = false,
}: ProductImageCarouselProps) {
  const visibleImages = useMemo(
    () =>
      getUniqueImages(typeof maxImages === "number" ? images.slice(0, maxImages) : images),
    [images, maxImages],
  );
  const [failedImageUrls, setFailedImageUrls] = useState<string[]>([]);
  const [fallbackImageUrls, setFallbackImageUrls] = useState<string[]>([]);
  const [directImageUrls, setDirectImageUrls] = useState<string[]>([]);
  const [loadedImageUrls, setLoadedImageUrls] = useState<string[]>([]);
  const [internalIndex, setInternalIndex] = useState(0);
  const [renderedIndex, setRenderedIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<1 | -1>(1);
  const [transitionStage, setTransitionStage] = useState<TransitionStage>("idle");
  const [isInViewport, setIsInViewport] = useState(true);
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    typeof document === "undefined" ? true : !document.hidden,
  );
  const [prefersReducedMotion] = useState(detectReducedMotionPreference);
  const rootRef = useRef<HTMLDivElement>(null);
  const transitionTimeoutRef = useRef<number | null>(null);
  const transitionFrameRef = useRef<number | null>(null);
  const retryAttemptsRef = useRef<Record<string, number>>({});
  const renderableImages = useMemo(
    () => visibleImages.filter((image) => !failedImageUrls.includes(image.url)),
    [failedImageUrls, visibleImages],
  );
  const isControlled = typeof currentIndex === "number";
  const shouldTrackAutoplayEnvironment =
    autoAdvance && renderableImages.length >= autoAdvanceMinImages;
  const activeIndex = isControlled
    ? moduloIndex(currentIndex ?? 0, Math.max(renderableImages.length, 1))
    : moduloIndex(internalIndex, Math.max(renderableImages.length, 1));
  const isTransitioning = previousIndex !== null && transitionStage !== "idle";

  useEffect(() => {
    const availableUrls = new Set(visibleImages.map((image) => image.url));

    Object.keys(retryAttemptsRef.current).forEach((imageUrl) => {
      if (!availableUrls.has(imageUrl)) {
        delete retryAttemptsRef.current[imageUrl];
      }
    });
    setFailedImageUrls((currentValue) =>
      currentValue.filter((imageUrl) => availableUrls.has(imageUrl)),
    );
    setFallbackImageUrls((currentValue) =>
      currentValue.filter((imageUrl) => availableUrls.has(imageUrl)),
    );
    setDirectImageUrls((currentValue) =>
      currentValue.filter((imageUrl) =>
        visibleImages.some(
          (image) => image.url === imageUrl || image.fallbackUrl === imageUrl,
        ),
      ),
    );
    setLoadedImageUrls((currentValue) =>
      currentValue.filter((imageUrl) => availableUrls.has(imageUrl)),
    );
  }, [visibleImages]);

  const retryFailedImages = useCallback((targetUrls?: string[]) => {
    const targetSet = targetUrls ? new Set(targetUrls) : null;

    setFailedImageUrls((currentValue) =>
      targetSet ? currentValue.filter((imageUrl) => !targetSet.has(imageUrl)) : [],
    );
    setFallbackImageUrls((currentValue) =>
      targetSet ? currentValue.filter((imageUrl) => !targetSet.has(imageUrl)) : [],
    );
    setDirectImageUrls((currentValue) =>
      targetSet ? currentValue.filter((imageUrl) => !targetSet.has(imageUrl)) : [],
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const retryAllFailedImages = () => {
      retryFailedImages();
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        retryAllFailedImages();
      }
    };

    window.addEventListener("online", retryAllFailedImages);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("online", retryAllFailedImages);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [retryFailedImages]);

  useEffect(() => {
    if (failedImageUrls.length === 0 || typeof window === "undefined") {
      return;
    }

    const retryableUrls = failedImageUrls.filter(
      (imageUrl) => (retryAttemptsRef.current[imageUrl] ?? 0) < 2,
    );

    if (retryableUrls.length === 0) {
      return;
    }

    const nextAttempt = Math.min(
      ...retryableUrls.map((imageUrl) => retryAttemptsRef.current[imageUrl] ?? 0),
    );
    const retryDelay = nextAttempt === 0 ? 1200 : 3600;
    const timeoutId = window.setTimeout(() => {
      retryableUrls.forEach((imageUrl) => {
        retryAttemptsRef.current[imageUrl] =
          (retryAttemptsRef.current[imageUrl] ?? 0) + 1;
      });
      retryFailedImages(retryableUrls);
    }, retryDelay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [failedImageUrls, retryFailedImages]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current !== null) {
        window.clearTimeout(transitionTimeoutRef.current);
      }
      if (transitionFrameRef.current !== null) {
        window.cancelAnimationFrame(transitionFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!shouldTrackAutoplayEnvironment || typeof document === "undefined") {
      return;
    }

    const handleVisibilityChange = () => {
      setIsDocumentVisible(!document.hidden);
    };

    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [shouldTrackAutoplayEnvironment]);

  useEffect(() => {
    const rootElement = rootRef.current;

    if (!rootElement || typeof IntersectionObserver === "undefined") {
      setIsInViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
      },
      {
        rootMargin: shouldTrackAutoplayEnvironment ? "120px 0px" : "420px 0px",
        threshold: shouldTrackAutoplayEnvironment ? 0.15 : 0.01,
      },
    );

    observer.observe(rootElement);

    return () => {
      observer.disconnect();
    };
  }, [shouldTrackAutoplayEnvironment]);

  useEffect(() => {
    if (isControlled || renderableImages.length === 0) {
      return;
    }

    setInternalIndex((currentValue) => moduloIndex(currentValue, renderableImages.length));
  }, [isControlled, renderableImages.length]);

  useEffect(() => {
    if (renderableImages.length === 0) {
      return;
    }

    setRenderedIndex((currentValue) => moduloIndex(currentValue, renderableImages.length));
  }, [renderableImages.length]);

  useEffect(() => {
    if (renderableImages.length === 0 || activeIndex === renderedIndex) {
      return;
    }

    if (prefersReducedMotion) {
      setPreviousIndex(null);
      setRenderedIndex(activeIndex);
      setTransitionStage("idle");
      return;
    }

    const normalizedCurrent = moduloIndex(renderedIndex, renderableImages.length);
    const normalizedNext = moduloIndex(activeIndex, renderableImages.length);
    const forwardDistance = moduloIndex(
      normalizedNext - normalizedCurrent,
      renderableImages.length,
    );
    const backwardDistance = moduloIndex(
      normalizedCurrent - normalizedNext,
      renderableImages.length,
    );
    const nextDirection: 1 | -1 = forwardDistance <= backwardDistance ? 1 : -1;

    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
    }
    if (transitionFrameRef.current !== null) {
      window.cancelAnimationFrame(transitionFrameRef.current);
    }

    setPreviousIndex(normalizedCurrent);
    setRenderedIndex(normalizedNext);
    setTransitionDirection(nextDirection);
    setTransitionStage("prepare");

    transitionFrameRef.current = window.requestAnimationFrame(() => {
      transitionFrameRef.current = window.requestAnimationFrame(() => {
        setTransitionStage("active");
        transitionTimeoutRef.current = window.setTimeout(() => {
          setPreviousIndex(null);
          setTransitionStage("idle");
        }, CAROUSEL_TRANSITION_MS);
      });
    });
  }, [activeIndex, prefersReducedMotion, renderableImages.length, renderedIndex]);

  useEffect(() => {
    if (
      !autoAdvance ||
      renderableImages.length < autoAdvanceMinImages ||
      !isInViewport ||
      !isDocumentVisible ||
      prefersReducedMotion
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const nextIndex = moduloIndex(activeIndex + 1, renderableImages.length);

      if (isControlled) {
        onIndexChange?.(nextIndex);
        return;
      }

      setInternalIndex(nextIndex);
    }, autoAdvanceDelay);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    activeIndex,
    autoAdvance,
    autoAdvanceDelay,
    autoAdvanceMinImages,
    isDocumentVisible,
    isInViewport,
    isControlled,
    onIndexChange,
    prefersReducedMotion,
    renderableImages.length,
  ]);

  const activeImage = renderableImages[renderedIndex] ?? null;
  const previousImage = previousIndex !== null ? renderableImages[previousIndex] ?? null : null;
  const fallbackImageUrlSet = useMemo(() => new Set(fallbackImageUrls), [fallbackImageUrls]);
  const directImageUrlSet = useMemo(() => new Set(directImageUrls), [directImageUrls]);
  const getImageRenderUrl = useCallback(
    (image: ProductCarouselImage) =>
      image.fallbackUrl && fallbackImageUrlSet.has(image.url) ? image.fallbackUrl : image.url,
    [fallbackImageUrlSet],
  );
  const getImageSourceProps = useCallback(
    (imageUrl: string) => {
      if (directImageUrlSet.has(imageUrl)) {
        return {
          src: imageUrl,
          srcSet: undefined,
        };
      }

      return {
        src: getOptimizedCatalogImageUrl(imageUrl, imageWidth, imageQuality),
        srcSet: getCatalogImageSrcSet(imageUrl, imageSrcSetWidths, imageQuality),
      };
    },
    [directImageUrlSet, imageQuality, imageSrcSetWidths, imageWidth],
  );
  const activeImageUrl = activeImage ? getImageRenderUrl(activeImage) : "";
  const previousImageUrl = previousImage ? getImageRenderUrl(previousImage) : "";
  const activeImageSource = activeImageUrl ? getImageSourceProps(activeImageUrl) : null;
  const previousImageSource = previousImageUrl ? getImageSourceProps(previousImageUrl) : null;
  const isActiveImageLoaded = activeImageUrl ? loadedImageUrls.includes(activeImageUrl) : false;

  useEffect(() => {
    if (
      !activeImageUrl ||
      !isInViewport ||
      isActiveImageLoaded ||
      directImageUrlSet.has(activeImageUrl) ||
      typeof window === "undefined"
    ) {
      return;
    }

    const optimizedUrl = getOptimizedCatalogImageUrl(activeImageUrl, imageWidth, imageQuality);

    if (optimizedUrl === activeImageUrl) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDirectImageUrls((currentValue) =>
        currentValue.includes(activeImageUrl) ? currentValue : [...currentValue, activeImageUrl],
      );
    }, OPTIMIZED_IMAGE_FALLBACK_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeImageUrl,
    directImageUrlSet,
    imageQuality,
    imageWidth,
    isActiveImageLoaded,
    isInViewport,
  ]);

  const handleImageLoaded = useCallback((sourceUrl: string, loadedUrl: string) => {
    retryAttemptsRef.current[sourceUrl] = 0;
    setLoadedImageUrls((currentValue) =>
      currentValue.includes(loadedUrl) ? currentValue : [...currentValue, loadedUrl],
    );
  }, []);

  const handleImageError = useCallback((image: ProductCarouselImage) => {
    const renderUrl = getImageRenderUrl(image);
    const optimizedUrl = getOptimizedCatalogImageUrl(renderUrl, imageWidth, imageQuality);

    if (transitionTimeoutRef.current !== null) {
      window.clearTimeout(transitionTimeoutRef.current);
    }
    if (transitionFrameRef.current !== null) {
      window.cancelAnimationFrame(transitionFrameRef.current);
    }

    setPreviousIndex(null);
    setTransitionStage("idle");
    setLoadedImageUrls((currentValue) =>
      currentValue.filter((currentImageUrl) => currentImageUrl !== renderUrl),
    );

    if (!directImageUrlSet.has(renderUrl) && optimizedUrl !== renderUrl) {
      setDirectImageUrls((currentValue) =>
        currentValue.includes(renderUrl) ? currentValue : [...currentValue, renderUrl],
      );
      return;
    }

    if (image.fallbackUrl && renderUrl !== image.fallbackUrl) {
      setFallbackImageUrls((currentValue) =>
        currentValue.includes(image.url) ? currentValue : [...currentValue, image.url],
      );
      return;
    }

    setFailedImageUrls((currentValue) =>
      currentValue.includes(image.url) ? currentValue : [...currentValue, image.url],
    );
  }, [directImageUrlSet, getImageRenderUrl, imageQuality, imageWidth]);

  function handleChangeImage(event: MouseEvent<HTMLButtonElement>, nextIndex: number) {
    event.preventDefault();
    event.stopPropagation();

    if (renderableImages.length <= 1 || isTransitioning) {
      return;
    }

    onManualNavigation?.();

    if (isControlled) {
      onIndexChange?.(moduloIndex(nextIndex, renderableImages.length));
      return;
    }

    setInternalIndex(moduloIndex(nextIndex, renderableImages.length));
  }

  if (!activeImage) {
    return <>{emptyState ?? DEFAULT_EMPTY_STATE}</>;
  }

  const currentImageTransform =
    transitionStage === "prepare"
      ? `translateX(${transitionDirection > 0 ? "100%" : "-100%"})`
      : "translateX(0%)";
  const previousImageTransform =
    transitionStage === "active"
      ? `translateX(${transitionDirection > 0 ? "-100%" : "100%"})`
      : "translateX(0%)";

  return (
    <div
      className={["relative overflow-hidden bg-stone-100", className].filter(Boolean).join(" ")}
      ref={rootRef}
    >
      <div className="relative">
        {!isActiveImageLoaded ? (
          <div className="absolute inset-0 animate-pulse bg-[linear-gradient(135deg,_rgba(224,242,254,0.56),_rgba(207,250,254,0.44)_55%,_rgba(241,245,249,0.5))]" />
        ) : null}

        {previousImage ? (
          <img
            alt={previousImage.alt}
            className={["absolute inset-0", imageClassName].filter(Boolean).join(" ")}
            decoding="async"
            key={previousImageSource?.src ?? previousImageUrl}
            loading="lazy"
            onError={() => {
              handleImageError(previousImage);
            }}
            onLoad={() => {
              handleImageLoaded(previousImage.url, previousImageUrl);
            }}
            sizes={imageSizes}
            src={previousImageSource?.src}
            srcSet={previousImageSource?.srcSet}
            style={{
              ...imageStyle,
              transform: previousImageTransform,
              transition: `transform ${CAROUSEL_TRANSITION_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`,
            }}
          />
        ) : null}

        <img
          alt={activeImage.alt}
          className={[
            previousImage ? "relative z-[1]" : "",
            imageClassName,
          ]
            .filter(Boolean)
            .join(" ")}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          key={activeImageSource?.src ?? activeImageUrl}
          loading={priority ? "eager" : "lazy"}
          onError={() => {
            handleImageError(activeImage);
          }}
          onLoad={() => {
            handleImageLoaded(activeImage.url, activeImageUrl);
          }}
          sizes={imageSizes}
          src={activeImageSource?.src}
          srcSet={activeImageSource?.srcSet}
          style={{
            ...imageStyle,
            opacity: isActiveImageLoaded ? 1 : 0,
            transform: currentImageTransform,
            transition: previousImage
              ? `transform ${CAROUSEL_TRANSITION_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 180ms ease`
              : "opacity 180ms ease",
          }}
        />
      </div>

      {renderableImages.length > 1 ? (
        <>
          <button
            aria-label="Ver imagen anterior"
            className={[
              "absolute left-1.5 top-1/2 z-[2] inline-flex h-12 w-5 -translate-y-1/2 items-center justify-center text-white transition-transform duration-200 hover:scale-110 active:scale-95 sm:h-14 sm:w-6",
              buttonClassName,
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={isTransitioning}
            onClick={(event) => {
              handleChangeImage(event, activeIndex - 1);
            }}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="h-7 w-3 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] sm:h-8 sm:w-3.5"
              fill="none"
              viewBox="0 0 12 28"
            >
              <path
                d="M9 3 L4 14 L9 25"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.1"
              />
            </svg>
          </button>

          <button
            aria-label="Ver imagen siguiente"
            className={[
              "absolute right-1.5 top-1/2 z-[2] inline-flex h-12 w-5 -translate-y-1/2 items-center justify-center text-white transition-transform duration-200 hover:scale-110 active:scale-95 sm:h-14 sm:w-6",
              buttonClassName,
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={isTransitioning}
            onClick={(event) => {
              handleChangeImage(event, activeIndex + 1);
            }}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="h-7 w-3 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] sm:h-8 sm:w-3.5"
              fill="none"
              viewBox="0 0 12 28"
            >
              <path
                d="M3 3 L8 14 L3 25"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.1"
              />
            </svg>
          </button>
        </>
      ) : null}
    </div>
  );
}
