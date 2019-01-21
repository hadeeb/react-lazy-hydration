import React, { ComponentType, useLayoutEffect, useRef, useState } from "react";
import { LazyProps } from "./index";

function useLazyHydrate(component: ComponentType, props: LazyProps) {
  const [hydrated, setHydrated] = useState(typeof window === "undefined");
  const childRef = useRef(null);

  const cleanupFns = useRef([]);

  const hydrate = useRef(function() {
    setHydrated(true);
    cleanup.current();
  });

  const io = useRef(
    typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (
              entry.target.parentElement === childRef.current &&
              (entry.isIntersecting || entry.intersectionRatio > 0)
            ) {
              console.log(entry.target);
              hydrate.current();
            }
          });
        })
      : null
  );

  const cleanup = useRef(function() {
    while (cleanupFns.current.length > 0) cleanupFns.current.pop()();
  });

  useLayoutEffect(() => {
    if (childRef.current.childElementCount === 0) {
      // No SSR rendered content.
      hydrate.current();
      return;
    }

    const { ssrOnly, whenIdle, whenVisible } = props;

    if (ssrOnly) return;

    if (whenIdle) {
      // @ts-ignore
      if (window.requestIdleCallback) {
        // @ts-ignore
        const id = window.requestIdleCallback(
          () => requestAnimationFrame(() => hydrate.current()),
          {
            timeout: 500
          }
        );
        // @ts-ignore
        cleanupFns.current.push(() => cancelIdleCallback(id));
      } else {
        hydrate.current();
        return;
      }
    }

    if (whenVisible) {
      if (io) {
        io.current.observe(childRef.current.children[0]);
        cleanupFns.current.push(() =>
          io.current.unobserve(childRef.current.children[0])
        );
      } else {
        hydrate.current();
      }
    }

    return cleanup.current;
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

export default useLazyHydrate;
