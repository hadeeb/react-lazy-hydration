import * as React from "react";

import { defaultStyle, useHydrationState } from "./utils";

type Props = Omit<
  React.HTMLProps<HTMLDivElement>,
  "dangerouslySetInnerHTML"
> & { on?: (keyof HTMLElementEventMap)[] | keyof HTMLElementEventMap };

function HydrateOn({ children, on, ...rest }: Props) {
  const [childRef, hydrated, hydrate] = useHydrationState();

  React.useEffect(() => {
    if (hydrated) return;

    const cleanupFns: VoidFunction[] = [];

    function cleanup() {
      for (let i = 0; i < cleanupFns.length; i++) {
        cleanupFns[i]();
      }
    }

    let events = Array.isArray(on) ? on.slice() : [on];

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
  }, [hydrated, hydrate, on, childRef]);

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

export { HydrateOn };
