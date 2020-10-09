import * as React from "react";

import { isBrowser, isDev } from "./constants.macro";

export type LazyProps = {
  ssrOnly?: boolean;
  whenIdle?: boolean;
  whenVisible?: boolean;
  noWrapper?: boolean;
  instantHydrate?: boolean;
  didHydrate?: VoidFunction;
  promise?: any;
  on?: (keyof HTMLElementEventMap)[] | keyof HTMLElementEventMap;
};

type Props = Omit<React.HTMLProps<HTMLDivElement>, "dangerouslySetInnerHTML"> &
  LazyProps;

type VoidFunction = () => void;

const event = "hydrate";

const io =
  isBrowser && IntersectionObserver
    ? new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting || entry.intersectionRatio > 0) {
              entry.target.dispatchEvent(new CustomEvent(event));
            }
          });
        },
        {
          rootMargin: "150px"
        }
      )
    : null;

// React currently throws a warning when using useLayoutEffect on the server.
const useIsomorphicLayoutEffect = isBrowser
  ? React.useLayoutEffect
  : React.useEffect;

const LazyHydrate: React.FunctionComponent<Props> = function(props) {
  const childRef = React.useRef<HTMLDivElement>(null);

  // Always render on server
  const [hydrated, setHydrated] = React.useState(!isBrowser);

  const {
    noWrapper,
    ssrOnly,
    whenIdle,
    whenVisible,
    promise, // pass a promise which hydrates
    instantHydrate, // helpful for unit tests, since this is an invisible component in regards to tests
    on = [],
    children,
    didHydrate, // callback for hydration
    ...rest
  } = props;

  if (
    isDev &&
    !ssrOnly &&
    !whenIdle &&
    !whenVisible &&
    !on.length &&
    !instantHydrate
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
    if (promise) {
      promise.then(hydrate);
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

  if (hydrated || instantHydrate) {
    if (noWrapper) {
      return children;
    }
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
