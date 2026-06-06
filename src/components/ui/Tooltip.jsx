import { useState } from 'react';
import {
  useFloating, useHover, useFocus,
  useInteractions, offset, flip, shift
} from '@floating-ui/react';

export default function Tooltip({ children, content }) {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open, onOpenChange: setOpen,
    middleware: [offset(6), flip(), shift()]
  });
  const hover = useHover(context);
  const focus = useFocus(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus]);
  
  return (
    <>
      <span ref={refs.setReference} {...getReferenceProps()}>{children}</span>
      {open && (
        // eslint-disable-next-line react-hooks/refs
        <div ref={refs.setFloating} style={{
          ...floatingStyles,
          background: 'var(--obsidian)', color: '#fff',
          fontSize: 11, padding: '4px 8px',
          borderRadius: 4, zIndex: 9999,
          pointerEvents: 'none', maxWidth: 200
        }} {...getFloatingProps()}>
          {content}
        </div>
      )}
    </>
  );
}
