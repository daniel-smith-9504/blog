"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface EffectContextType {
  clickEffect: boolean;
  mouseTrail: boolean;
  seasonalEffect: boolean;
  sparkleEffect: boolean;
  toggleClickEffect: () => void;
  toggleMouseTrail: () => void;
  toggleSeasonalEffect: () => void;
  toggleSparkleEffect: () => void;
}

const EffectContext = createContext<EffectContextType>({
  clickEffect: true,
  mouseTrail: false,
  seasonalEffect: false,
  sparkleEffect: false,
  toggleClickEffect: () => {},
  toggleMouseTrail: () => {},
  toggleSeasonalEffect: () => {},
  toggleSparkleEffect: () => {},
});

export function EffectProvider({ children }: { children: ReactNode }) {
  const [clickEffect, setClickEffect] = useState(true);
  const [mouseTrail, setMouseTrail] = useState(false);
  const [seasonalEffect, setSeasonalEffect] = useState(false);
  const [sparkleEffect, setSparkleEffect] = useState(false);

  // 仅恢复 clickEffect，其余高耗资源特效强制默认关闭
  useEffect(() => {
    const savedClick = localStorage.getItem("clickEffect");
    if (savedClick !== null) setClickEffect(savedClick === "true");
    // mouseTrail / seasonalEffect / sparkleEffect 强制关闭，不再恢复历史状态
    setMouseTrail(false);
    setSeasonalEffect(false);
    setSparkleEffect(false);
    localStorage.setItem("mouseTrail", "false");
    localStorage.setItem("seasonalEffect", "false");
    localStorage.setItem("sparkleEffect", "false");
  }, []);

  const toggleClickEffect = () => {
    setClickEffect((prev) => {
      localStorage.setItem("clickEffect", String(!prev));
      return !prev;
    });
  };

  const toggleMouseTrail = () => {
    setMouseTrail((prev) => {
      localStorage.setItem("mouseTrail", String(!prev));
      return !prev;
    });
  };

  const toggleSeasonalEffect = () => {
    setSeasonalEffect((prev) => {
      localStorage.setItem("seasonalEffect", String(!prev));
      return !prev;
    });
  };

  const toggleSparkleEffect = () => {
    setSparkleEffect((prev) => {
      localStorage.setItem("sparkleEffect", String(!prev));
      return !prev;
    });
  };

  return (
    <EffectContext.Provider value={{ clickEffect, mouseTrail, seasonalEffect, sparkleEffect, toggleClickEffect, toggleMouseTrail, toggleSeasonalEffect, toggleSparkleEffect }}>
      {children}
    </EffectContext.Provider>
  );
}

export function useEffects() {
  return useContext(EffectContext);
}
