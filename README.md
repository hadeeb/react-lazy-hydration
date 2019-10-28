# React Lazy Hydration

Lazy Hydration for Server Rendered React Components

## Installation

```bash
npm i react-lazy-hydration
```

OR

```bash
yarn add react-lazy-hydration
```

## Usage

```jsx
import React from "react";
import LazyHydrate from "react-lazy-hydration";

function App() {
  return (
    <div>
      {/* Skip Hydrating  */}
      <LazyHydrate ssrOnly>
        {...}
      </LazyHydrate>
      {/* Requires IntersectionObserver. Polyfill not included. */}
      <LazyHydrate whenVisible>
        {...}
      </LazyHydrate>
      {/* Requires requestIdleCallback. Polyfill not included. */}
      <LazyHydrate whenIdle>
        {...}
      </LazyHydrate>
      {/* Hydrate on any of the following events */}
      <LazyHydrate on="click" /*OR on={["click","mouseenter",...]} */>
        {...}
      </LazyHydrate>
    </div>
  );
}
```

## Notes

Based on this [comment](https://github.com/facebook/react/issues/10923#issuecomment-338715787)

and heavily adapted from [Lazy hydration for Vue SSR](https://github.com/znck/lazy-hydration)

## Contribute

First off, thanks for taking the time to contribute!
Now, take a moment to be sure your contributions make sense to everyone else.

### Reporting Issues

Found a problem? Want a new feature? First of all see if your issue or idea has [already been reported](https://github.com/hadeeb/react-lazy-hydrate/issues).
If not, just open a [new clear and descriptive issue](https://github.com/hadeeb/react-lazy-hydrate/issues/new).

### Submitting pull requests

Pull requests are the greatest contributions, so be sure they are focused in scope, and do avoid unrelated commits.
