import * as React from "react";

export type LazyProps = {
  ssrOnly?: boolean;
  whenIdle?: boolean;
  whenVisible?: boolean;
  on?: (keyof HTMLElementEventMap)[];
};

type VoidFunction = () => void;

const isBrowser =
  typeof window !== "undefined" &&
  typeof window.document !== "undefined" &&
  typeof window.document.createElement !== "undefined";

// React currently throws a warning when using useLayoutEffect on the server.
const useIsomorphicLayoutEffect = isBrowser
  ? React.useLayoutEffect
  : React.useEffect;

const LazyHydrate: React.FunctionComponent<LazyProps> = function(props) {
  const childRef = React.useRef<HTMLDivElement>(null);
  const cleanupFns = React.useRef<VoidFunction[]>([]);
  const io = React.useRef<IntersectionObserver>(null);
  const idleCallbackId = React.useRef<number>(null);

  // Always render on server
  const [hydrated, setHydrated] = React.useState(!isBrowser);

  const { ssrOnly, whenIdle, whenVisible, on = [], children } = props;

  if (!ssrOnly && !whenIdle && !whenVisible) {
    console.warn(`LazyHydrate: Set atleast one of the props to 'true'`);
  }

  useIsomorphicLayoutEffect(() => {
    // No SSR Content
    if (childRef.current.childElementCount === 0) {
      setHydrated(true);
    }
  }, []);

  React.useEffect(() => {
    if (ssrOnly || hydrated) return;
    function cleanup() {
      while (cleanupFns.current.length) {
        cleanupFns.current.pop()();
      }
    }
    function hydrate() {
      setHydrated(true);
      cleanup();
    }

    if (whenIdle) {
      // @ts-ignore
      if (requestIdleCallback) {
        // @ts-ignore
        idleCallbackId.current = requestIdleCallback(
          () => requestAnimationFrame(() => hydrate()),
          {
            timeout: 500
          }
        );
        cleanupFns.current.push(() =>
          // @ts-ignore
          cancelIdleCallback(idleCallbackId.current)
        );
      } else {
        return hydrate();
      }
    }

    if (whenVisible) {
      if (io.current === null && typeof IntersectionObserver !== "undefined") {
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
      }
      if (io.current) {
        // As root node does not have any box model, it cannot intersect.
        io.current.observe(childRef.current.children[0]);
        cleanupFns.current.push(() =>
          io.current.unobserve(childRef.current.children[0])
        );
      } else {
        return hydrate();
      }
    }

    on.forEach(event => {
      childRef.current.addEventListener(event, hydrate, {
        once: true,
        capture: true
      });
      cleanupFns.current.push(() =>
        childRef.current.removeEventListener(event, hydrate, { capture: true })
      );
    });

    return cleanup;
  }, [hydrated, ssrOnly, whenIdle, whenVisible]);

  if (hydrated) {
    return (
      <div ref={childRef} style={{ display: "contents" }}>
        {children}
      </div>
    );
  } else {
    return (
      <div
        ref={childRef}
        style={{ display: "contents" }}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: "" }}
      />
    );
  }
};

export default LazyHydrate;
