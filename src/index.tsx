import * as React from "react";

import { isBrowser, isDev } from "./constants.macro";

export type LazyProps = {
  ssrOnly?: boolean;
  whenIdle?: boolean;
  whenVisible?: boolean | IntersectionObserverInit;
  noWrapper?: boolean | keyof JSX.IntrinsicElements;
  didHydrate?: VoidFunction;
  promise?: Promise<any>;
  on?: (keyof HTMLElementEventMap)[] | keyof HTMLElementEventMap;
  children: React.ReactElement;
  as?: keyof JSX.IntrinsicElements;
};

type Props = Omit<React.HTMLProps<HTMLElement>, "dangerouslySetInnerHTML"> &
  LazyProps;

type VoidFunction = () => void;

// React currently throws a warning when using useLayoutEffect on the server.
const useIsomorphicLayoutEffect = isBrowser
  ? React.useLayoutEffect
  : React.useEffect;

function reducer() {
  return true;
}

function LazyHydrate(props: Props) {
  const childRef = React.useRef<HTMLElement>(null);

  // Always render on server
  const [hydrated, hydrate] = React.useReducer(reducer, !isBrowser);

  const {
    noWrapper,
    ssrOnly,
    whenIdle,
    whenVisible,
    promise, // pass a promise which hydrates
    on = [],
    children,
    didHydrate, // callback for hydration
    as = 'div',
    ...rest
  } = props;

  if (
    isDev &&
    !ssrOnly &&
    !whenIdle &&
    !whenVisible &&
    !on.length &&
    !promise
  ) {
    console.error(
      `LazyHydration: Enable atleast one trigger for hydration.\n` +
        `If you don't want to hydrate, use ssrOnly`
    );
  }

  useIsomorphicLayoutEffect(() => {
    // No SSR Content
    if (!childRef.current.hasChildNodes()) {
      hydrate();
    }
  }, []);

  React.useEffect(() => {
    if (hydrated && didHydrate) {
      didHydrate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  React.useEffect(() => {
    if (ssrOnly || hydrated) return;
    const rootElement = childRef.current;

    const cleanupFns: VoidFunction[] = [];
    function cleanup() {
      cleanupFns.forEach(fn => {
        fn();
      });
    }

    if (promise) {
      promise.then(hydrate, hydrate);
    }

    if (whenVisible) {
      const element = noWrapper
        ? rootElement
        : // As root node does not have any box model, it cannot intersect.
          rootElement.firstElementChild;

      if (element && typeof IntersectionObserver !== "undefined") {
        const observerOptions =
          typeof whenVisible === "object"
            ? whenVisible
            : {
                rootMargin: "250px"
              };

        const io = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting || entry.intersectionRatio > 0) {
              hydrate();
            }
          });
        }, observerOptions);

        io.observe(element);

        cleanupFns.push(() => {
          io.disconnect();
        });
      } else {
        return hydrate();
      }
    }
    if (whenIdle) {
      // @ts-ignore
      if (typeof requestIdleCallback !== "undefined") {
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

    const events = ([] as Array<keyof HTMLElementEventMap>).concat(on);

    events.forEach(event => {
      rootElement.addEventListener(event, hydrate, {
        once: true,
        passive: true
      });
      cleanupFns.push(() => {
        rootElement.removeEventListener(event, hydrate, {});
      });
    });

    return cleanup;
  }, [
    hydrated,
    on,
    ssrOnly,
    whenIdle,
    whenVisible,
    didHydrate,
    promise,
    noWrapper
  ]);

  const WrapperElement = ((typeof noWrapper === "string"
    ? noWrapper
    : as) as unknown) as React.FC<React.HTMLProps<HTMLElement>>;

  if (hydrated) {
    if (noWrapper) {
      return children;
    }
    return (
      <WrapperElement ref={childRef} style={{ display: "contents" }} {...rest}>
        {children}
      </WrapperElement>
    );
  } else {
    return (
      <WrapperElement
        {...rest}
        ref={childRef}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: "" }}
      />
    );
  }
}

export default LazyHydrate;
