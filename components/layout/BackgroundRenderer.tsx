"use client";

import { useBackground } from "@/components/providers/BackgroundProvider";
import { useConfigValue, useConfigJson } from "@/components/providers/SiteConfigProvider";
import { siteConfig } from "@/siteConfig";

export default function BackgroundRenderer() {
  const { bgImage, bgBlur } = useBackground();
  const useGradientRaw = useConfigValue("useGradient", String(siteConfig.useGradient));
  const useGradient = useGradientRaw === "true";
  const themeColors = useConfigJson<string[]>("themeColors", siteConfig.themeColors);
  const bgImages = useConfigJson<string[]>("bgImages", siteConfig.bgImages);

  const fallbackBg = bgImages[0] || siteConfig.bgImages[0];

  return (
    <div className="fixed inset-0 -z-10 h-lvh">
      {useGradient ? (
        <div
          className="absolute inset-0 gradient-background"
          style={{
            backgroundImage: `linear-gradient(135deg, ${themeColors.join(", ")})`,
          }}
        />
      ) : (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${bgImage || fallbackBg})`,
            }}
          />
          {/* 深色模式遮罩 */}
          <div className="absolute inset-0 bg-transparent dark:bg-black/60 transition-colors duration-500" />
          {bgBlur > 0 && (
            <div
              className="absolute inset-0"
              style={{
                backdropFilter: `blur(${bgBlur}px)`,
                WebkitBackdropFilter: `blur(${bgBlur}px)`,
              }}
            />
          )}
        </>
      )}
    </div>
  );
}