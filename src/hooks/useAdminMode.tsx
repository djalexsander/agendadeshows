import { createContext, useContext, useState, ReactNode } from "react";

type AdminMode = "admin" | "empresa";

interface AdminModeContextType {
  mode: AdminMode;
  setMode: (mode: AdminMode) => void;
  isEmpresaMode: boolean;
}

const AdminModeContext = createContext<AdminModeContextType>({
  mode: "admin",
  setMode: () => {},
  isEmpresaMode: false,
});

export function AdminModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AdminMode>("admin");

  return (
    <AdminModeContext.Provider value={{ mode, setMode, isEmpresaMode: mode === "empresa" }}>
      {children}
    </AdminModeContext.Provider>
  );
}

export const useAdminMode = () => useContext(AdminModeContext);
