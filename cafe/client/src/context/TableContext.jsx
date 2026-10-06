import React, { createContext, useContext, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import api from "../services/api";

const TableContext = createContext();

export const TableProvider = ({ children }) => {
  const location = useLocation();
  const [tableNumber, setTableNumberState] = useState(() => {
    const saved = localStorage.getItem("bb_table");
    return saved ? Number(saved) : null;
  });
  const [tableToken, setTableTokenState] = useState(() => {
    return localStorage.getItem("bb_table_token") || "";
  });
  const [tableId, setTableIdState] = useState(() => {
    return localStorage.getItem("bb_table_id") || "";
  });
  const [cafe, setCafeState] = useState(() => {
    const saved = localStorage.getItem("bb_cafe");
    return saved ? JSON.parse(saved) : null;
  });
  const [tableError, setTableError] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  // Watch URL for ?table=X on every location change
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tableParam = params.get("table");
    if (tableParam) {
      const resolveToken = async () => {
        setIsResolving(true);
        setTableError("");
        try {
          const res = await api.resolveTable(tableParam);
          if (res.success && res.table) {
            setTableNumberState(res.table.tableNumber);
            setTableTokenState(res.table.qrToken || tableParam);
            setTableIdState(res.table.id || "");
            setCafeState(res.cafe || null);
            localStorage.setItem("bb_table", res.table.tableNumber.toString());
            if (res.table.qrToken) localStorage.setItem("bb_table_token", res.table.qrToken);
            if (res.table.id) localStorage.setItem("bb_table_id", res.table.id);
            if (res.cafe) localStorage.setItem("bb_cafe", JSON.stringify(res.cafe));
          }
        } catch (err) {
          console.warn("[TableContext] Failed to resolve table token:", err.message);
          setTableError(err.message);
          // If invalid, clear table context
          setTableNumberState(null);
          setTableTokenState("");
          setTableIdState("");
          localStorage.removeItem("bb_table");
          localStorage.removeItem("bb_table_token");
          localStorage.removeItem("bb_table_id");
        } finally {
          setIsResolving(false);
        }
      };
      resolveToken();
    }
  }, [location.search]);

  const setTableNumber = (num) => {
    if (num) {
      setTableNumberState(Number(num));
      localStorage.setItem("bb_table", num.toString());
    } else {
      setTableNumberState(null);
      setTableTokenState("");
      setTableIdState("");
      localStorage.removeItem("bb_table");
      localStorage.removeItem("bb_table_token");
      localStorage.removeItem("bb_table_id");
    }
  };

  return (
    <TableContext.Provider
      value={{
        tableNumber,
        tableToken,
        tableId,
        cafe,
        tableError,
        isResolving,
        setTableNumber,
        isTableSet: !!tableNumber,
      }}
    >
      {children}
    </TableContext.Provider>
  );
};

export const useTable = () => useContext(TableContext);
