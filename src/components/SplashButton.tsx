import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { playSound, type SoundType } from '../lib/sounds';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  sound?: SoundType;
  splashColor?: string;
}

export function SplashButton({ children, onClick, className, style = {}, disabled, sound = 'click', splashColor = 'rgba(34,197,94,0.8)', ...props }: Props) {
  const [splashes, setSplashes] = useState<any[]>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    playSound(sound);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newSplash = { id: Date.now(), x, y };
    setSplashes(s => [...s, newSplash]);
    setTimeout(() => setSplashes(s => s.filter(s => s.id !== newSplash.id)), 1000);
    
    if (onClick) onClick(e);
  };

  const isFullWidth = style.width === '100%';
  const hasFlex = style.flex !== undefined;

  const wrapperStyle: React.CSSProperties = {
    position: 'relative',
    display: (isFullWidth || hasFlex) ? 'flex' : 'inline-block',
    flexDirection: 'column',
    flex: style.flex,
    width: style.width || (hasFlex ? '100%' : 'auto'),
    marginTop: style.marginTop,
    marginBottom: style.marginBottom,
    marginLeft: style.marginLeft,
    marginRight: style.marginRight,
  };

  const buttonStyle: React.CSSProperties = {
    ...style,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    flex: 1,
    width: '100%',
    position: 'relative',
    zIndex: 1
  };

  return (
    <div style={wrapperStyle}>
      <AnimatePresence>
        {splashes.map(s => (
          <motion.div
            key={s.id}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: [0, 2.5, 4], opacity: [0.8, 0.4, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              width: 100,
              height: 100,
              marginLeft: -50,
              marginTop: -50,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${splashColor} 0%, rgba(16,42,20,0) 70%)`,
              filter: 'blur(10px)',
              pointerEvents: 'none',
              zIndex: 0 // Place behind the button
            }}
          />
        ))}
      </AnimatePresence>
      <button 
        className={className} 
        style={buttonStyle} 
        onClick={handleClick}
        disabled={disabled}
        {...props}
      >
        {children}
      </button>
    </div>
  );
}
