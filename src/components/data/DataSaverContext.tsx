import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  DATA_SAVER_EVENT,
  addSavedBytes,
  getSavedBytes,
  isDataSaverEnabled,
  isSlowNetwork,
  resetSavedBytes,
  setDataSaverEnabled,
} from "@/lib/data-saver";

type DataSaverCtx = {
  enabled: boolean;
  savedBytes: number;
  slowNetwork: boolean;
  setEnabled: (value: boolean) => void;
  toggle: () => void;
  recordSaving: (bytes: number) => void;
  resetSavings: () => void;
};

const Ctx = createContext<DataSaverCtx | null>(null);

export function DataSaverProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false);
  const [savedBytes, setSavedBytes] = useState(0);
  const [slowNetwork, setSlowNetwork] = useState(false);

  useEffect(() => {
    const sync = () => {
      setEnabledState(isDataSaverEnabled());
      setSavedBytes(getSavedBytes());
    };
    // Activation automatique au premier lancement sur réseau lent (2G/3G).
    const slow = isSlowNetwork();
    setSlowNetwork(slow);
    if (slow && window.localStorage.getItem("mascartube:data-saver") === null) {
      setDataSaverEnabled(true);
    }
    sync();
    window.addEventListener(DATA_SAVER_EVENT, sync);
    return () => window.removeEventListener(DATA_SAVER_EVENT, sync);
  }, []);

  const setEnabled = useCallback((value: boolean) => setDataSaverEnabled(value), []);

  return (
    <Ctx.Provider
      value={{
        enabled,
        savedBytes,
        slowNetwork,
        setEnabled,
        toggle: () => setEnabled(!enabled),
        recordSaving: addSavedBytes,
        resetSavings: resetSavedBytes,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useDataSaver(): DataSaverCtx {
  const value = useContext(Ctx);
  if (!value) {
    return {
      enabled: false,
      savedBytes: 0,
      slowNetwork: false,
      setEnabled: () => {},
      toggle: () => {},
      recordSaving: () => {},
      resetSavings: () => {},
    };
  }
  return value;
}
