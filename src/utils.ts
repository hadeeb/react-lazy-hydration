import * as React from "react";

import { isBrowser, isDev } from "./constants.macro";

// React currently throws a warning when using useLayoutEffect on the server.
const useIsomorphicLayoutEffect = isBrowser
  ? React.useLayoutEffect
  : React.useEffect;

function useHydrationState(): [
  React.MutableRefObject<HTMLDivElement>,
  boolean,
  VoidFunction
] {
  const childRef = React.useRef<HTMLDivElement>(null);

  const [hydrated, setHydrated] = React.useState(!isBrowser);

  useIsomorphicLayoutEffect(() => {
    // No SSR Content
    if (!childRef.current.hasChildNodes()) {
      setHydrated(true);
    }
  }, []);

  const hydrate = React.useCallback(() => {
    setHydrated(true);
  }, []);

  return React.useMemo(() => [childRef, hydrated, hydrate], [
    hydrated,
    hydrate
  ]);
}

const defaultStyle: React.CSSProperties = { display: "contents" };

function warnAboutDeprecation({ on, whenIdle, whenVisible, ssrOnly }) {
  if (isDev) {
    console.warn(
      "[%creact-lazy-hydration%c]: Default export is deprecated",
      "font-weight:bold",
      ""
    );
    if (on != null) {
      console.warn(
        `To hydrate on events, use the new HydrateOn component
      %cimport { HydrateOn } from "react-lazy-hydration";

      <HydrateOn on={${JSON.stringify(on)}}>
       {children}
      </HydrateOn>
      `,
        "color:red"
      );
    }
    if (whenIdle != null) {
      console.warn(
        `To hydrate on idle, use the new HydrateOnIdle component
      %cimport { HydrateOnIdle } from "react-lazy-hydration";

      <HydrateOnIdle>
       {children}
      </HydrateOnIdle>
      `,
        "color:red"
      );
    }
    if (whenVisible != null) {
      console.warn(
        `To hydrate when component becomes visible, use the new HydrateWhenVisible component
      %cimport { HydrateWhenVisible } from "react-lazy-hydration";

      <HydrateWhenVisible>
       {children}
      </HydrateWhenVisible>
      `,
        "color:red"
      );
    }
    if (ssrOnly != null) {
      console.warn(
        `To skip client side hydration, use the new SsrOnly component
      %cimport { SsrOnly } from "react-lazy-hydration";

      <SsrOnly>
       {children}
      </SsrOnly>
      `,
        "color:red"
      );
    }
  }
}

export { useHydrationState, defaultStyle, warnAboutDeprecation };
