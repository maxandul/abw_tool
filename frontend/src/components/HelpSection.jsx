import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function HelpSection({ id, title, children }) {
  const ref = useRef(null);
  const { hash } = useLocation();
  useEffect(() => {
    if (!id || hash !== `#${id}` || !ref.current) return;
    ref.current.open = true;
    const frame = requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ block: 'start' });
      ref.current?.querySelector('summary')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [hash, id]);
  return (
    <details ref={ref} id={id} className="card scroll-mt-6">
      <summary className="cursor-pointer text-base font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600">
        <h2 className="inline">{title}</h2>
      </summary>
      <div className="space-y-3 mt-3">{children}</div>
    </details>
  );
}
