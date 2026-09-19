import { X } from '@phosphor-icons/react';
import { useEffect, type ReactNode } from 'react';

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', closeOnEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-[#010A04]/80 p-3 backdrop-blur-md sm:p-6" role="dialog" aria-modal="true" aria-labelledby="modal-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div data-modal className="relative max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-[8px] border border-white/10 bg-[#191C21] text-white shadow-[0_32px_100px_rgba(0,0,0,.65)]">
      <div className="vertex-grid pointer-events-none absolute inset-0 opacity-[.08]" />
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#191C21]/95 px-5 py-5 backdrop-blur-xl sm:px-7">
        <div><p className="vertex-mono text-[9px] uppercase tracking-[.18em] text-[#4ADE80]">Workspace action</p><h2 id="modal-title" className="mt-1 text-2xl font-medium tracking-[-.04em]">{title}</h2></div>
        <button type="button" aria-label="Close dialog" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-[8px] border border-white/10 text-white/55 transition-colors hover:border-white/20 hover:bg-white/[.05] hover:text-white"><X size={18}/></button>
      </header>
      <div className="relative p-5 sm:p-7">{children}</div>
    </div>
  </div>;
}
