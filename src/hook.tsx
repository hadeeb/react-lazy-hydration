import React, {
  ComponentType,
  useLayoutEffect,
  useEffect,
  useRef,
  useState,
  MutableRefObject
} from "react";
import { LazyProps } from "./index";

export default function useLazyHydration(
  component: ComponentType,
  props: LazyProps
) {
  const { ssrOnly, whenIdle, whenVisible } = props;

  if (!ssrOnly && !whenIdle && !whenVisible) {
    console.warn(`LazyHydrate: Set atleast one of the props to 'true'`);
  }

  const [hydrated, setHydrated] = useState(typeof window === "undefined");
  const childRef: MutableRefObject<HTMLDivElement> = useRef(null);
  const cleanupFns: MutableRefObject<Array<Function>> = useRef([]);

  function cleanup() {
    while (cleanupFns.current.length > 0) cleanupFns.current.pop()();
  }

  function hydrate() {
    if (!hydrated) setHydrated(true);
    cleanup();
  }

  const io: MutableRefObject<IntersectionObserver> = useRef(null);

  useLayoutEffect(() => {
    if (childRef.current.childElementCount === 0) {
      // No SSR rendered content.
      hydrate();
    }
  }, []);

  useEffect(() => {
    if (hydrated || ssrOnly) return;

    if (whenIdle) {
      // @ts-ignore
      if (window.requestIdleCallback) {
        // @ts-ignore
        const id = window.requestIdleCallback(
          () => requestAnimationFrame(() => hydrate()),
          {
            timeout: 500
          }
        );
        // @ts-ignore
        cleanupFns.current.push(() => cancelIdleCallback(id));
      } else {
        hydrate();
        return;
      }
    }

    if (whenVisible) {
      if (typeof IntersectionObserver !== "undefined") {
        io.current = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (
              entry.target.parentElement === childRef.current &&
              (entry.isIntersecting || entry.intersectionRatio > 0)
            ) {
              hydrate();
            }
          });
        });
        io.current.observe(childRef.current.children[0]);
        cleanupFns.current.push(() => io.current.disconnect());
      } else {
        hydrate();
      }
    }

    return cleanup;
  }, []);

  const lazyComponent = hydrated ? (
    <div ref={childRef} style={{ display: "contents" }}>
      {component}
    </div>
  ) : (
    <div
      ref={childRef}
      style={{ display: "contents" }}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: "" }}
    />
  );
  return [lazyComponent, hydrated];
}
