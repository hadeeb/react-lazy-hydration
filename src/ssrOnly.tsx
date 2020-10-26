import * as React from "react";

import { defaultStyle, useHydrationState } from "./utils";

type Props = Omit<React.HTMLProps<HTMLDivElement>, "dangerouslySetInnerHTML">;

function SsrOnly({ children, ...rest }: Props) {
  const [childRef, hydrated] = useHydrationState();

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

export { SsrOnly };
