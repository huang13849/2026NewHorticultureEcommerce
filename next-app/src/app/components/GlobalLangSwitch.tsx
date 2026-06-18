'use client';

import RegionSwitch from './RegionSwitch';

export default function GlobalLangSwitch() {
  return (
    <div className="fixed top-3 right-3 z-[100] flex items-center gap-2">
      <RegionSwitch />
    </div>
  );
}
