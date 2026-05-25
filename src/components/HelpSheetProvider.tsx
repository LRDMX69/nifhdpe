import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { HelpSheet } from "./HelpSheet";

interface Ctx { open: () => void }
const HelpCtx = createContext<Ctx>({ open: () => {} });
export const useHelpSheet = () => useContext(HelpCtx);

export const HelpSheetProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  return (
    <HelpCtx.Provider value={{ open }}>
      {children}
      <HelpSheet open={isOpen} onOpenChange={setOpen} />
    </HelpCtx.Provider>
  );
};