import React, { useEffect, useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Printer, ExternalLink, Plus, Coffee, Wifi, Sparkles, Download, CheckCircle2, XCircle } from "lucide-react";
import OwnerHeader from "../../components/owner/OwnerHeader";
import api from "../../services/api";

const QRCodes = () => {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(1);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newTableNum, setNewTableNum] = useState("");

  const cardRef = useRef(null);

  const fetchTablesAndSettings = async () => {
    try {
      const [tableRes, setRes] = await Promise.all([api.getTables(), api.getSettings()]);
      if (tableRes.success) {
        setTables(tableRes.tables);
        if (tableRes.tables.length > 0) {
          setSelectedTable(tableRes.tables[0].tableNumber);
        }
      }
      if (setRes.success) {
        setSettings(setRes.settings);
      }
    } catch (err) {
      console.warn("[QRCodes] Load error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTablesAndSettings();
  }, []);

  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!newTableNum) return;
    try {
      await api.createTable({ tableNumber: Number(newTableNum), capacity: 4 });
      setNewTableNum("");
      fetchTablesAndSettings();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleStatus = async (table) => {
    try {
      const updatedStatus = !table.isActive;
      await api.updateTable(table._id, { isActive: updatedStatus });
      setTables(tables.map((t) => (t._id === table._id ? { ...t, isActive: updatedStatus } : t)));
    } catch (err) {
      alert(err.message);
    }
  };

  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
  const selectedTableObj = tables.find((t) => t.tableNumber === selectedTable);
  const qrParam = selectedTableObj?.qrToken || selectedTable;
  const qrUrl = `${currentOrigin}/?table=${qrParam}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("table-qr-svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `brewbuddies-table-${selectedTable}-qr.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="p-8 space-y-6">
      <OwnerHeader
        title="Table QR Code Generator"
        subtitle="Generate, customize, and print high-resolution QR codes for dine-in tables"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadQR}
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-stone-200 transition-colors"
            >
              <Download className="w-4 h-4 text-stone-600" />
              <span>Download SVG</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-amber-900 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Table Card</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Table Selector & Add Table */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-3">
              Select Dine-in Table
            </h3>

            <div className="grid grid-cols-4 gap-2">
              {tables.map((t) => (
                <button
                  key={t._id}
                  onClick={() => setSelectedTable(t.tableNumber)}
                  className={`py-2.5 rounded-xl font-bold text-xs transition-all flex flex-col items-center justify-center border ${
                    selectedTable === t.tableNumber
                      ? "bg-amber-900 text-white border-amber-900 shadow-sm scale-105"
                      : "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  <span className="text-[9px] font-normal uppercase text-amber-200">Tbl</span>
                  <span>#{t.tableNumber}</span>
                </button>
              ))}
            </div>

            {selectedTableObj && (
              <div className="mt-4 p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-stone-800">Table #{selectedTableObj.tableNumber}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedTableObj.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {selectedTableObj.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-0.5">
                    {selectedTableObj.isActive ? "Accepting dine-in orders" : "Ordering disabled for table"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleStatus(selectedTableObj)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all border ${
                    selectedTableObj.isActive
                      ? "bg-white text-stone-700 border-stone-300 hover:bg-stone-100"
                      : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {selectedTableObj.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            )}

            {/* Add Table form */}
            <form onSubmit={handleAddTable} className="mt-5 pt-4 border-t border-stone-100 flex gap-2">
              <input
                type="number"
                min="1"
                max="99"
                placeholder="Table #"
                value={newTableNum}
                onChange={(e) => setNewTableNum(e.target.value)}
                className="w-24 text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <button
                type="submit"
                className="flex-1 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Table</span>
              </button>
            </form>
          </div>

          {/* Direct Link Preview */}
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs text-xs space-y-2">
            <span className="font-bold text-stone-700 block">Dine-in URL Preview:</span>
            <p className="font-mono text-[11px] text-stone-500 break-all bg-stone-50 p-2 rounded-xl border border-stone-100">
              {qrUrl}
            </p>
            <a
              href={qrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-amber-900 font-semibold hover:underline pt-1"
            >
              <span>Test table customer view in new tab</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Right Column: Printable Table Card Preview */}
        <div className="lg:col-span-8 flex justify-center">
          <div
            ref={cardRef}
            className="w-full max-w-sm bg-white rounded-3xl border-2 border-stone-300 shadow-xl p-6 text-center space-y-4 print:border-none print:shadow-none print:m-0"
          >
            {/* Header */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-950 text-amber-300 flex items-center justify-center shadow-md mb-2">
                <Coffee className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold font-serif text-stone-900 leading-tight">
                {settings?.cafeName || "BrewBuddies Cafe"}
              </h2>
              <p className="text-[11px] text-amber-800 uppercase tracking-widest font-semibold mt-0.5">
                {settings?.tagline || "Artisan Coffee & Cozy Moments"}
              </p>
            </div>

            {/* Table Number Badge */}
            <div className="inline-block bg-amber-100 text-amber-950 border border-amber-300 px-5 py-1.5 rounded-full">
              <span className="text-sm font-extrabold font-serif tracking-tight">
                TABLE #{selectedTable}
              </span>
            </div>

            {/* QR Code */}
            <div className="bg-amber-50/60 p-4 rounded-3xl border border-amber-200/80 inline-block mx-auto shadow-inner">
              <QRCodeSVG
                id="table-qr-svg"
                value={qrUrl}
                size={180}
                level="H"
                includeMargin={true}
                bgColor={"#faf8f5"}
                fgColor={"#261a13"}
              />
            </div>

            {/* Instructions */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
                Scan to View Menu & Order
              </h4>
              <p className="text-[11px] text-stone-500 leading-relaxed max-w-xs mx-auto">
                Point your phone camera at the code to browse our handcrafted drinks, customize your order, and earn loyalty points.
              </p>
            </div>

            {/* Wi-Fi Info */}
            <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-3 text-[11px] text-stone-600 flex items-center justify-around">
              <div className="flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-amber-700" />
                <span className="font-semibold">{settings?.wifiSsid || "BrewBuddies_WiFi"}</span>
              </div>
              <span className="text-stone-300">|</span>
              <div>
                <span className="text-stone-400">Pass: </span>
                <span className="font-mono font-bold text-stone-800">
                  {settings?.wifiPassword || "Coffee2026"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodes;
