import * as React from 'react';

import throttle = require('lodash.throttle');

export type SplitViewProps = {
  header: React.ReactNode;
  left: React.ReactNode;
  right: React.ReactNode;
  active?: boolean;
  min?: number;
}

type From = {
  x: number;
  size: number;
};

const isTouchEvent = (e: any): e is TouchEvent | React.TouchEvent => !!e.touches;

export function SplitView(props: SplitViewProps) {
  const {
    header,
    left,
    right,
    min = 480,
    active = false,
  } = props;

  let size = min;

  let from: From | null = null;

  const leftRef = React.useRef<HTMLDivElement>(null);
  const resizeLeft = (width: number) => {
    const target = leftRef.current;
    if (target) {
      size = Math.max(width, min);
      target.style.width = `${size}px`;
    }
  };

  const onStart = (e: React.MouseEvent | React.TouchEvent) => {
    const x = !isTouchEvent(e)
      ? e.screenX
      : e.touches[0].screenX;

    from = { x, size };
  };

  const onEnd = () => {
    from = null;
  };

  const onMove = throttle((e: MouseEvent | TouchEvent) => {
    if (from) {
      const currentX = !isTouchEvent(e)
        ? e.screenX
        : e.touches[0].screenX;

      const diffX = currentX - from.x;
      resizeLeft(diffX + from.size);
    }
  }, 30);

  const onTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    onMove(e);
  };

  const resize = () => {
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);

    if (vw < 960) {
      const target = leftRef.current;
      if (target) {
        target.style.width = '100%';
      }
    } else {
      resizeLeft(size);
    }
  };

  const onResize = throttle(resize, 30);

  React.useLayoutEffect(() => {
    resize();

    window.addEventListener('mouseup', onEnd);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', resize);

    return () => {
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', resize);
    };
  });

  const rightPanelClassName = React.useMemo(() => (
    active
      ? 'split-view-panel is-primary is-active'
      : 'split-view-panel is-primary'
  ), [active]);

  return (
    <div className="split-view">
      <div className="split-view-header">{header}</div>
      <div className="split-view-panels">
        <div className="split-view-panel" ref={leftRef}>{left}</div>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div
          className="split-view-handle"
          onMouseDown={onStart}
          onTouchStart={onStart}
        >
          <i className="dots" />
        </div>
        <div className={rightPanelClassName}>{right}</div>
      </div>
    </div>
  );
}
