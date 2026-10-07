"use client";

import Script from "next/script";

// Live2D 看板娘默认关闭，如需启用改为 true
const LIVE2D_ENABLED = false;

export default function Live2D() {
  if (!LIVE2D_ENABLED) return null;

  return (
    <Script
      src="/live2d/jsdelivr/random/autoload.js?v=4"
      strategy="lazyOnload"
    />
  );
}