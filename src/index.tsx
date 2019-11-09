import * as React from "react";

export type LazyProps = {
  ssrOnly?: boolean;
  whenIdle?: boolean;
  whenVisible?: boolean;
  on?: (keyof HTMLElementEventMap)[] | keyof HTMLElementEventMap;
};

type Props = Omit<React.HTMLProps<HTMLDivElement>, "dangerouslySetInnerHTML"> &
  LazyProps;

type VoidFunction = () => void;

const isBrowser =
  typeof window !== "undefined" &&
  typeof window.document !== "undefined" &&
  typeof window.document.createElement !== "undefined";

// React currently throws a warning when using useLayoutEffect on the server.
const useIsomorphicLayoutEffect = isBrowser
  ? React.useLayoutEffect
  : React.useEffect;

const LazyHydrate: React.FunctionComponent<Props> = function(props) {
  const childRef = React.useRef<HTMLDivElement>(null);
  const cleanupFns = React.useRef<VoidFunction[]>([]);
  const io = React.useRef<IntersectionObserver>(null);

  // Always render on server
  const [hydrated, setHydrated] = React.useState(!isBrowser);

  const { ssrOnly, whenIdle, whenVisible, on = [], children, ...rest } = props;

  if (
    process.env.NODE_ENV !== "production" &&
    !ssrOnly &&
    !whenIdle &&
    !whenVisible &&
    !on.length
  ) {
    console.error(
      `LazyHydration: Enable atleast one trigger for hydration.\n` +
        `If you don't want to hydrate, use ssrOnly`
    );
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
    }

    if (whenIdle) {
      // @ts-ignore
      if (requestIdleCallback) {
        // @ts-ignore
        const idleCallbackId = requestIdleCallback(
          () => requestAnimationFrame(() => hydrate()),
          { timeout: 500 }
        );
        cleanupFns.current.push(() => {
          // @ts-ignore
          cancelIdleCallback(idleCallbackId);
        });
      } else {
        setTimeout(hydrate, 2000);
      }
    }

    if (whenVisible) {
      if (io.current === null && IntersectionObserver) {
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
      if (io.current && childRef.current.childElementCount !== 0) {
        // As root node does not have any box model, it cannot intersect.
        io.current.observe(childRef.current.children[0]);
        cleanupFns.current.push(() => {
          io.current.unobserve(childRef.current.children[0]);
        });
      } else {
        return hydrate();
      }
    }

    const events = Array.isArray(on) ? on : [on];

    events.forEach(event => {
      childRef.current.addEventListener(event, hydrate, {
        once: true,
        capture: true
      });
      cleanupFns.current.push(() => {
        childRef.current.removeEventListener(event, hydrate, { capture: true });
      });
    });

    return cleanup;
  }, [hydrated, on, ssrOnly, whenIdle, whenVisible]);

  if (hydrated) {
    return (
      <div ref={childRef} style={{ display: "contents" }} {...rest}>
        {children}
      </div>
    );
  } else {
    return (
      <div
        ref={childRef}
        style={{ display: "contents" }}
        suppressHydrationWarning
        {...rest}
        dangerouslySetInnerHTML={{ __html: "" }}
      />
    );
  }
};

export default LazyHydrate;
