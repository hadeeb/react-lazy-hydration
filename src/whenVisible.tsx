import * as React from "react";

import { defaultStyle, useHydrationState } from "./utils";

type Props = Omit<
  React.HTMLProps<HTMLDivElement>,
  "dangerouslySetInnerHTML"
> & {
  observerOptions?: IntersectionObserverInit;
};

function HydrateWhenVisible({ children, observerOptions, ...rest }: Props) {
  const [childRef, hydrated, hydrate] = useHydrationState();

  React.useEffect(() => {
    if (hydrated) return;

    const io = IntersectionObserver
      ? new IntersectionObserver(entries => {
          // As only one element is observed,
          // there is no need to loop over the array
          if (entries.length) {
            const entry = entries[0];
            if (entry.isIntersecting || entry.intersectionRatio > 0) {
              hydrate();
            }
          }
        }, observerOptions)
      : null;

    if (io && childRef.current.childElementCount) {
      // As root node does not have any box model, it cannot intersect.
      const el = childRef.current.children[0];
      io.observe(el);

      return () => {
        io.unobserve(el);
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

export { HydrateWhenVisible };
