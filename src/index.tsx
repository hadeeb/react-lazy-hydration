import * as React from "react";

export type LazyProps = {
  ssrOnly?: boolean;
  whenIdle?: boolean;
  whenVisible?: boolean;
};

type VoidFunction = () => void;

const LazyHydrate: React.FunctionComponent<LazyProps> = function(props) {
  const childRef = React.useRef<HTMLDivElement>(null);
  const cleanupFns = React.useRef<VoidFunction[]>([]);
  const io = React.useRef<IntersectionObserver>(null);
  const idleCallbackId = React.useRef<number>(null);

  // Always render on server
  const [hydrated, setHydrated] = React.useState(typeof window === "undefined");

  const { ssrOnly, whenIdle, whenVisible, children } = props;

  if (!ssrOnly && !whenIdle && !whenVisible) {
    console.warn(`LazyHydrate: Set atleast one of the props to 'true'`);
  }

  React.useLayoutEffect(() => {
    // No SSR Content
    if (childRef.current.childElementCount === 0) {
      setHydrated(true);
    }
  }, []);

  React.useEffect(() => {
    if (ssrOnly || hydrated) return;
    function cleanup() {
      cleanupFns.current.pop()();
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
