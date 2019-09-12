import React, { Component, createRef } from "react";

export type LazyProps = {
  ssrOnly: boolean;
  whenIdle: boolean;
  whenVisible: boolean;
};

type LazyState = {
  hydrated: boolean;
};

class LazyHydrate extends Component<LazyProps, LazyState> {
  childRef: React.RefObject<HTMLDivElement>;
  cleanupFns: Array<Function>;
  io: IntersectionObserver;

  constructor(props: LazyProps) {
    super(props);
    this.state = {
      // Always render on server
      hydrated: typeof window === "undefined"
    };

    const { ssrOnly, whenIdle, whenVisible } = props;

    if (!ssrOnly && !whenIdle && !whenVisible) {
      console.warn(`LazyHydrate: Set atleast one of the props to 'true'`);
    }

    this.childRef = createRef();
    this.cleanupFns = [];
    this.hydrate = this.hydrate.bind(this);

    this.io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(entries => {
            entries.forEach(entry => {
              if (
                entry.target.parentElement === this.childRef.current &&
                (entry.isIntersecting || entry.intersectionRatio > 0)
              ) {
                this.hydrate();
              }
            });
          })
        : null;
  }

  hydrate() {
    this.setState({ hydrated: true });
    while (this.cleanupFns.length > 0) this.cleanupFns.pop()();
  }

  componentDidMount() {
    if (this.childRef.current.childElementCount === 0) {
      // No SSR rendered content.
      this.hydrate();
      return;
    }

    const { ssrOnly, whenIdle, whenVisible } = this.props;

    if (ssrOnly) return;

    if (whenIdle) {
      // @ts-ignore
      if (window.requestIdleCallback) {
        // @ts-ignore
        const id = window.requestIdleCallback(
          () => requestAnimationFrame(() => this.hydrate()),
          {
            timeout: 500
          }
        );
        // @ts-ignore
        this.cleanupFns.push[() => cancelIdleCallback(id)];
      } else {
        this.hydrate();
      }
    }

    if (whenVisible) {
      if (this.io) {
        // As root node does not have any box model, it cannot intersect.
        this.io.observe(this.childRef.current.children[0]);
        this.cleanupFns.push(() =>
          this.io.unobserve(this.childRef.current.children[0])
        );
      } else {
        this.hydrate();
      }
    }
  }

  render() {
    if (this.state.hydrated) {
      return (
        <div ref={this.childRef} style={{ display: "contents" }}>
          {this.props.children}
        </div>
      );
    } else {
      return (
        <div
          ref={this.childRef}
          style={{ display: "contents" }}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: "" }}
        />
      );
    }
  }
}

export default LazyHydrate;

export { default as useLazyHydration } from "./hook";
