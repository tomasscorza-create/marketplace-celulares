import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import type { Material, Object3D } from "three";

const GRID_PARALLAX_FACTOR = 0.18;
const GRID_PARALLAX_MAX_PX = 26;
const GRID_PARALLAX_RESET_TRANSITION = "transform 420ms cubic-bezier(0.22, 0.61, 0.36, 1)";

function clampParallax(value: number) {
  return Math.min(GRID_PARALLAX_MAX_PX, Math.max(-GRID_PARALLAX_MAX_PX, value));
}

const VIEWER_GRID_BACKGROUND_STYLE: CSSProperties = {
  inset: "-10%",
  willChange: "transform",
  backgroundImage: [
    "radial-gradient(circle at 50% 42%, rgba(240,242,255,0.98) 0%, rgba(216,225,254,0.78) 38%, rgba(199,210,254,0.58) 62%, rgba(196,181,253,0.42) 85%, rgba(165,180,252,0.34) 100%)",
    "repeating-linear-gradient(0deg, rgba(99,102,241,0.55) 0px, rgba(99,102,241,0.55) 1px, transparent 1px, transparent 64px)",
    "repeating-linear-gradient(90deg, rgba(99,102,241,0.55) 0px, rgba(99,102,241,0.55) 1px, transparent 1px, transparent 64px)",
    "repeating-linear-gradient(0deg, rgba(165,180,252,0.3) 0px, rgba(165,180,252,0.3) 1px, transparent 1px, transparent 16px)",
    "repeating-linear-gradient(90deg, rgba(165,180,252,0.3) 0px, rgba(165,180,252,0.3) 1px, transparent 1px, transparent 16px)",
  ].join(", "),
  WebkitMaskImage:
    "radial-gradient(circle at 50% 42%, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.78) 75%, rgba(0,0,0,1) 100%)",
  maskImage:
    "radial-gradient(circle at 50% 42%, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.78) 75%, rgba(0,0,0,1) 100%)",
};

type ProductModel3DViewerProps = {
  controlsLevel?: "compact" | "full";
  isLiteMode?: boolean;
  modelUrl: string;
  posterUrl?: string | null;
  title: string;
};

type ViewerStatus = "idle" | "loading" | "ready" | "error";

type ViewerControlsApi = {
  reset: () => void;
  setAutoRotate: (value: boolean) => void;
  zoomBy: (delta: number) => void;
};

type DisposableObject3D = Object3D & {
  geometry?: { dispose: () => void };
  material?: Material | Material[];
};

function disposeObject3D(object: Object3D) {
  object.traverse?.((child) => {
    const disposableChild = child as DisposableObject3D;

    disposableChild.geometry?.dispose();

    if (Array.isArray(disposableChild.material)) {
      disposableChild.material.forEach((material) => material.dispose());
      return;
    }

    disposableChild.material?.dispose();
  });
}

export function ProductModel3DViewer({
  controlsLevel = "full",
  isLiteMode = false,
  modelUrl,
  posterUrl,
  title,
}: ProductModel3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const controlsApiRef = useRef<ViewerControlsApi | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [status, setStatus] = useState<ViewerStatus>("idle");
  const [isAutoRotating, setIsAutoRotating] = useState(!isLiteMode);

  const handleZoom = useCallback((delta: number) => {
    controlsApiRef.current?.zoomBy(delta);
  }, []);

  const handleReset = useCallback(() => {
    controlsApiRef.current?.reset();
    setIsAutoRotating(!isLiteMode);
  }, [isLiteMode]);

  const handleToggleAutoRotate = useCallback(() => {
    setIsAutoRotating((currentValue) => {
      const nextValue = !currentValue;
      controlsApiRef.current?.setAutoRotate(nextValue);
      return nextValue;
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || typeof window === "undefined") {
      return;
    }

    const rect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const warmupDistance = 180;

    if (rect.top <= viewportHeight + warmupDistance && rect.bottom >= -warmupDistance) {
      setShouldLoad(true);
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "180px 0px", threshold: 0.08 },
    );

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !modelUrl || !shouldLoad || typeof window === "undefined") {
      return;
    }

    let isDisposed = false;
    let animationFrameId = 0;
    let cleanupRenderer: (() => void) | null = null;

    setStatus("loading");

    async function loadViewer() {
      try {
        const [Three, { GLTFLoader }, { OrbitControls }, { MeshoptDecoder }] = await Promise.all([
          import("three"),
          import("three/examples/jsm/loaders/GLTFLoader.js"),
          import("three/examples/jsm/controls/OrbitControls.js"),
          import("three/examples/jsm/libs/meshopt_decoder.module.js"),
        ]);

        if (isDisposed || !container) {
          return;
        }

        const scene = new Three.Scene();
        const camera = new Three.PerspectiveCamera(38, 1, 0.1, 100);
        const renderer = new Three.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        });
        const controls = new OrbitControls(camera, renderer.domElement);
        const keyLight = new Three.DirectionalLight(0xffffff, 2.4);
        const fillLight = new Three.HemisphereLight(0xe0f2fe, 0x475569, 1.2);
        const loader = new GLTFLoader();
        loader.setMeshoptDecoder(MeshoptDecoder);

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isLiteMode ? 1.2 : 1.8));
        renderer.outputColorSpace = Three.SRGBColorSpace;
        renderer.domElement.setAttribute("aria-label", `Modelo 3D de ${title}`);
        renderer.domElement.setAttribute("role", "img");
        renderer.domElement.className =
          "absolute inset-0 z-10 h-full w-full cursor-grab touch-none active:cursor-grabbing";
        renderer.domElement.style.touchAction = "none";
        container.appendChild(renderer.domElement);

        const gridElement = gridRef.current;
        let isDraggingGrid = false;
        let dragStartX = 0;
        let dragStartY = 0;

        const handleGridPointerDown = (event: PointerEvent) => {
          isDraggingGrid = true;
          dragStartX = event.clientX;
          dragStartY = event.clientY;
          if (gridElement) {
            gridElement.style.transition = "none";
          }
        };
        const handleGridPointerMove = (event: PointerEvent) => {
          if (!isDraggingGrid || !gridElement) {
            return;
          }

          const offsetX = clampParallax((event.clientX - dragStartX) * GRID_PARALLAX_FACTOR);
          const offsetY = clampParallax((event.clientY - dragStartY) * GRID_PARALLAX_FACTOR);
          gridElement.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0)`;
        };
        const handleGridPointerUp = () => {
          if (!isDraggingGrid) {
            return;
          }

          isDraggingGrid = false;
          if (gridElement) {
            gridElement.style.transition = GRID_PARALLAX_RESET_TRANSITION;
            gridElement.style.transform = "translate3d(0px, 0px, 0)";
          }
        };

        renderer.domElement.addEventListener("pointerdown", handleGridPointerDown);
        window.addEventListener("pointermove", handleGridPointerMove);
        window.addEventListener("pointerup", handleGridPointerUp);
        window.addEventListener("pointercancel", handleGridPointerUp);

        keyLight.position.set(2.6, 4, 3.4);
        scene.add(keyLight, fillLight);

        controls.enableDamping = true;
        controls.enablePan = false;
        controls.enableRotate = true;
        controls.enableZoom = true;
        controls.minDistance = 3;
        controls.maxDistance = 5.4;
        controls.minPolarAngle = Math.PI * 0.18;
        controls.maxPolarAngle = Math.PI * 0.86;
        controls.autoRotate = !isLiteMode;
        controls.autoRotateSpeed = 0.7;
        controls.addEventListener("start", () => {
          controls.autoRotate = false;
          setIsAutoRotating(false);
        });

        controlsApiRef.current = {
          reset: () => {
            camera.position.set(0, 0.4, 4.2);
            controls.target.set(0, 0, 0);
            controls.autoRotate = !isLiteMode;
            controls.update();
          },
          setAutoRotate: (value: boolean) => {
            controls.autoRotate = value;
            controls.update();
          },
          zoomBy: (delta: number) => {
            const direction = new Three.Vector3()
              .subVectors(camera.position, controls.target)
              .normalize();
            const currentDistance = camera.position.distanceTo(controls.target);
            const nextDistance = Math.min(
              controls.maxDistance,
              Math.max(controls.minDistance, currentDistance + delta),
            );

            camera.position.copy(controls.target).addScaledVector(direction, nextDistance);
            controls.autoRotate = false;
            controls.update();
            setIsAutoRotating(false);
          },
        };

        const resize = () => {
          const { height, width } = container.getBoundingClientRect();
          const safeWidth = Math.max(width, 1);
          const safeHeight = Math.max(height, 1);

          camera.aspect = safeWidth / safeHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(safeWidth, safeHeight, false);
        };

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        const gltf = await loader.loadAsync(modelUrl);

        if (isDisposed) {
          disposeObject3D(gltf.scene);
          return;
        }

        const model = gltf.scene;
        const box = new Three.Box3().setFromObject(model);
        const size = box.getSize(new Three.Vector3());
        const center = box.getCenter(new Three.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z, 0.001);
        const scale = 2.35 / maxAxis;

        model.position.sub(center);
        model.scale.setScalar(scale);
        scene.add(model);

        camera.position.set(0, 0.4, 4.2);
        controls.target.set(0, 0, 0);
        controls.update();

        setStatus("ready");

        const animate = () => {
          if (isDisposed) {
            return;
          }

          controls.update();
          renderer.render(scene, camera);
          animationFrameId = window.requestAnimationFrame(animate);
        };

        animate();

        cleanupRenderer = () => {
          window.cancelAnimationFrame(animationFrameId);
          resizeObserver.disconnect();
          renderer.domElement.removeEventListener("pointerdown", handleGridPointerDown);
          window.removeEventListener("pointermove", handleGridPointerMove);
          window.removeEventListener("pointerup", handleGridPointerUp);
          window.removeEventListener("pointercancel", handleGridPointerUp);
          if (gridElement) {
            gridElement.style.transition = "";
            gridElement.style.transform = "";
          }
          controls.dispose();
          controlsApiRef.current = null;
          disposeObject3D(model);
          renderer.dispose();
          renderer.domElement.remove();
        };
      } catch {
        if (!isDisposed) {
          setStatus("error");
        }
      }
    }

    void loadViewer();

    return () => {
      isDisposed = true;
      cleanupRenderer?.();
    };
  }, [isLiteMode, modelUrl, shouldLoad, title]);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      data-status={status}
      data-testid="product-model-3d-viewer"
      ref={containerRef}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute z-0"
        ref={gridRef}
        style={VIEWER_GRID_BACKGROUND_STYLE}
      />
      {posterUrl ? (
        <img
          alt=""
          aria-hidden="true"
          className={[
            "pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover object-center transition-opacity duration-300",
            status === "ready" ? "opacity-0" : "opacity-75",
          ].join(" ")}
          decoding="async"
          loading="lazy"
          src={posterUrl}
        />
      ) : null}
      {status === "loading" ? (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-white/20">
          <span className="h-8 w-8 rounded-full border-2 border-ocean-100 border-t-ocean-500 animate-spin" />
        </div>
      ) : null}
      {status === "ready" ? (
        <div className="absolute right-2.5 top-2.5 z-30 flex flex-col gap-1.5 sm:right-3 sm:top-3">
          {[
            {
              ariaLabel: "Acercar modelo",
              label: "+",
              onClick: () => {
                handleZoom(-0.45);
              },
            },
            {
              ariaLabel: "Alejar modelo",
              label: "-",
              onClick: () => {
                handleZoom(0.45);
              },
            },
            {
              ariaLabel: "Restablecer vista",
              label: "R",
              onClick: handleReset,
            },
            ...(controlsLevel === "full"
              ? [
                  {
                    ariaLabel: isAutoRotating ? "Pausar rotacion" : "Reanudar rotacion",
                    label: isAutoRotating ? "P" : "A",
                    onClick: handleToggleAutoRotate,
                  },
                ]
              : []),
          ].map((control) => (
            <button
              aria-label={control.ariaLabel}
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/75 bg-white/88 text-sm font-semibold leading-none text-ocean-700 shadow-sm backdrop-blur transition-colors hover:bg-ocean-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean-500 sm:h-9 sm:w-9"
              key={control.ariaLabel}
              onClick={control.onClick}
              type="button"
            >
              {control.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
