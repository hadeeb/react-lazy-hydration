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

const event = "hydrate";

const io =
  isBrowser && IntersectionObserver
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            entry.target.dispatchEvent(new CustomEvent(event));
          }
        });
      })
    : null;

// React currently throws a warning when using useLayoutEffect on the server.
const useIsomorphicLayoutEffect = isBrowser
  ? React.useLayoutEffect
  : React.useEffect;

const LazyHydrate: React.FunctionComponent<Props> = function(props) {
  const childRef = React.useRef<HTMLDivElement>(null);

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
    if (!childRef.current.hasChildNodes()) {
      setHydrated(true);
    }
  }, []);

  React.useEffect(() => {
    if (ssrOnly || hydrated) return;
    const cleanupFns: VoidFunction[] = [];
    function cleanup() {
      while (cleanupFns.length) {
        cleanupFns.pop()();
      }
    }
    function hydrate() {
      setHydrated(true);
    }

    if (whenIdle) {
      // @ts-ignore
      if (requestIdleCallback) {
        // @ts-ignore
        const idleCallbackId = requestIdleCallback(hydrate, { timeout: 500 });
        cleanupFns.push(() => {
          // @ts-ignore
          cancelIdleCallback(idleCallbackId);
        });
      } else {
        const id = setTimeout(hydrate, 2000);
        cleanupFns.push(() => {
          clearTimeout(id);
        });
      }
    }

    let events = Array.isArray(on) ? on.slice() : [on];

    if (whenVisible) {
      if (io && childRef.current.childElementCount) {
        // As root node does not have any box model, it cannot intersect.
        const el = childRef.current.children[0];
        io.observe(el);
        events.push(event as keyof HTMLElementEventMap);

        cleanupFns.push(() => {
          io.unobserve(el);
        });
      } else {
        return hydrate();
      }
    }

    events.forEach(event => {
      childRef.current.addEventListener(event, hydrate, {
        once: true,
        capture: true,
        passive: true
      });
      cleanupFns.push(() => {
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
