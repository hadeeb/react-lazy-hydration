import * as React from "react";

import { defaultStyle, useHydrationState } from "./utils";

type Props = Omit<React.HTMLProps<HTMLDivElement>, "dangerouslySetInnerHTML">;

function HydrateOnIdle({ children, ...rest }: Props) {
  const [childRef, hydrated, hydrate] = useHydrationState();

  React.useEffect(() => {
    if (hydrated) return;

    // @ts-ignore
    if (requestIdleCallback) {
      // @ts-ignore
      const idleCallbackId = requestIdleCallback(hydrate, { timeout: 500 });
      return () => {
        // @ts-ignore
        cancelIdleCallback(idleCallbackId);
      };
    } else {
      const id = setTimeout(hydrate, 2000);
      return () => {
        clearTimeout(id);
      };
    }
  }, [hydrated, hydrate]);

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

export { HydrateOnIdle };
