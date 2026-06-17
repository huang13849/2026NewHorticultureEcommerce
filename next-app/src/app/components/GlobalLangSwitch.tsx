'use client';

import LangSwitch from './LangSwitch';

export default function GlobalLangSwitch() {
  return (
    <div className="fixed top-3 right-3 z-[100] bg-white/90 backdrop-blur-md rounded-full shadow-md">
      <LangSwitch />
    </div>
  );
}
