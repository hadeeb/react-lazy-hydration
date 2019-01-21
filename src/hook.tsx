import React, { ComponentType, useLayoutEffect, useRef, useState } from "react";
import { LazyProps } from "./index";

export function useLazyHydration(component: ComponentType, props: LazyProps) {
  const { ssrOnly, whenIdle, whenVisible } = props;

  if (!ssrOnly && !whenIdle && !whenVisible) {
    console.warn(`LazyHydrate: Set atleast one of the props to 'true'`);
  }
  const [hydrated, setHydrated] = useState(typeof window === "undefined");
  const childRef = useRef(null);

  const cleanupFns = useRef([]);

  function cleanup() {
    while (cleanupFns.current.length > 0) cleanupFns.current.pop()();
  }

  function hydrate() {
    setHydrated(true);
    cleanup();
  }

  const io =
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (
              entry.target.parentElement === childRef.current &&
              (entry.isIntersecting || entry.intersectionRatio > 0)
            ) {
              hydrate();
            }
          });
        })
      : null;

  useLayoutEffect(() => {
    if (childRef.current.childElementCount === 0) {
      // No SSR rendered content.
      hydrate();
      return;
    }

    if (ssrOnly) return;

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
      if (io) {
        io.observe(childRef.current.children[0]);
        cleanupFns.current.push(() =>
          io.unobserve(childRef.current.children[0])
        );
      } else {
        hydrate();
      }
    }

    return cleanup;
  }, []);

  if (hydrated) {
    return (
      <div ref={childRef} style={{ display: "contents" }}>
        {component}
      </div>
    );
  } else {
    return (
      <div
        ref={childRef}
        style={{ display: "contents" }}
        dangerouslySetInnerHTML={{ __html: "" }}
      />
    );
  }
}
