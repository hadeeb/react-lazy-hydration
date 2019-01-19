import React, { Component, createRef } from "react";

class LazyHydrate extends Component {
  constructor() {
    super();
    this.state = {
      // Always render on server
      hydrated: typeof window === "undefined"
    };
    this.childRef = createRef();

    this.cleanupFns = [];
    this.hydrate = this.hydrate.bind(this);

    this.io =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(entries => {
            entries.forEach(entry => {
              if (
                entry.target === this.childRef.current &&
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

    if (whenIdle)
      if (requestIdleCallback) {
        const id = requestIdleCallback(
          () => requestAnimationFrame(() => this.hydrate()),
          {
            timeout: 500
          }
        );
        this.cleanupFns.push[() => cancelIdleCallback(id)];
      } else {
        this.hydrate();
      }

    if (whenVisible) {
      if (this.io) {
        io.observe(this.childRef.current);
        this.cleanupFns.push(() => this.io.unobserve(this.childRef.current));
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
          dangerouslySetInnerHTML={{ __html: "" }}
        />
      );
    }
  }
}

export default LazyHydrate;
