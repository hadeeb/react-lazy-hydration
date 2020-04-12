import * as React from "react";

import { defaultStyle, useHydrationState } from "./utils";

type Props = Omit<
  React.HTMLProps<HTMLDivElement>,
  "dangerouslySetInnerHTML"
> & {
  observerOptions?: IntersectionObserverInit;
};

const hydrationEvent = "hydrate";

function HydrateWhenVisible({ children, observerOptions, ...rest }: Props) {
  const [childRef, hydrated, hydrate] = useHydrationState();

  React.useEffect(() => {
    if (hydrated) return;

    const io = createIntersectionObserver(observerOptions);

    // As root node does not have any box model, it cannot intersect.
    const domElement = childRef.current!.firstElementChild;

    if (io && domElement) {
      io.observe(domElement);

      domElement.addEventListener(hydrationEvent, hydrate, {
        once: true,
        capture: true,
        passive: true
      });

      return () => {
        io.unobserve(domElement);

        domElement.removeEventListener(hydrationEvent, hydrate, {
          capture: true
        });
      };
    } else {
      hydrate();
    }
  }, [hydrated, hydrate, childRef, observerOptions]);

  if (hydrated) {
    return (
      <div ref={childRef} style={defaultStyle} children={children} {...rest} />
    );
  } else {
    return (
      <div
        ref={childRef}
        style={defaultStyle}
        suppressHydrationWarning
        {...rest}
        dangerouslySetInnerHTML={{ __html: "" }}
      />
    );
  }
}

const observerCache = new WeakMap<
  IntersectionObserverInit,
  IntersectionObserver
>();

const defaultOptions = {};

function createIntersectionObserver(
  observerOptions?: IntersectionObserverInit
) {
  if (!IntersectionObserver) return null;

  observerOptions = observerOptions || defaultOptions;

  let io = observerCache.get(observerOptions);

  if (!io) {
    observerCache.set(
      observerOptions,
      (io = new IntersectionObserver(entries => {
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          if (entry.isIntersecting || entry.intersectionRatio > 0) {
            entry.target.dispatchEvent(new CustomEvent(hydrationEvent));
          }
        }
      }, observerOptions))
    );
  }

  return io;
}

export { HydrateWhenVisible };
