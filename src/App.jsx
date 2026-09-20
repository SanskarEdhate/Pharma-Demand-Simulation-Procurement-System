import React, { useState, useMemo } from "react";
import { runSimulation } from "./utils/simulation";
import FileUploader from "./components/FileUploader";
import KPICards from "./components/KPICards";
import AnalyticsCharts from "./components/AnalyticsCharts";
import DashboardTabs from "./components/DashboardTabs";
import SimulationDatePicker from "./components/SimulationDatePicker";
import { Pill, RefreshCw, ChevronRight } from "lucide-react";

export default function App() {
  const [rawUploadedData, setRawUploadedData] = useState(null);
  const [simDate, setSimDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Compute simulation data dynamically
  const simulationData = useMemo(() => {
    if (!rawUploadedData) return null;
    console.log("Computing simulation data...");
    const startTime = performance.now();
    try {
      const result = runSimulation(rawUploadedData, simDate);
      const endTime = performance.now();
      console.log(`Simulation completed in ${(endTime - startTime).toFixed(2)}ms`);
      return result;
    } catch (err) {
      console.error("Simulation run failed: ", err);
      return null;
    }
  }, [rawUploadedData, simDate]);

  const handleDataLoaded = (rawData) => {
    console.log("handleDataLoaded called with", rawData.length, "rows");
    setIsProcessing(true);
    
    // Add 15-second timeout for overall processing
    const processingTimeout = setTimeout(() => {
      console.error("CSV processing timeout - 15 seconds exceeded");
      setIsProcessing(false);
      alert("CSV processing failed. Please check file format.");
    }, 15000);
    
    // Simulate brief processing delay for premium user feedback
    setTimeout(() => {
      clearTimeout(processingTimeout);
      console.log("Setting rawUploadedData");
      setRawUploadedData(rawData);
      setIsProcessing(false);
      console.log("Processing complete, dashboard should render");
    }, 1000);
  };

  const handleReset = () => {
    setRawUploadedData(null);
  };

  return (
    <div className="min-h-screen bg-paper text-ink font-body selection:bg-accent/20 selection:text-accent relative pb-16 flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="border-b border-rule bg-paper-2/40 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-paper-3 border border-rule rounded-md text-accent">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base text-ink tracking-tight">
                  Ageis Flow
                </span>
                <span className="px-1.5 py-0.5 rounded-sm text-[10px] font-body font-semibold bg-accent/10 text-accent border border-accent/20">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-ink-2 font-body font-medium">
                AI Pharma Procurement Suite
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <SimulationDatePicker simDate={simDate} setSimDate={setSimDate} />
          </div>
        </div>
      </header>

      {/* Loading Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-paper/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-fade-in">
          <div className="relative w-12 h-12 mb-4">
            <div className="absolute inset-0 border-2 border-accent/15 rounded-full"></div>
            <div className="absolute inset-0 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-sm font-body font-medium text-ink">Rebuilding Warehouse Ledger...</p>
          <p className="text-xs text-ink-2 font-body mt-1">Calculating safety stock parameters & FEFO draw rates</p>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!simulationData ? (
          /* Onboarding / Landing View: Marquee Hero Structure */
          <div className="flex flex-col items-center justify-center py-12 lg:py-20">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-body font-medium bg-accent/10 text-accent border border-accent/20 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
                FEFO Batch Expiration Simulation
              </div>
              <h2 className="text-3xl sm:text-5xl font-display font-bold text-ink tracking-tight mb-4 leading-tight">
                Pharma Demand Simulation & Procurement Engine
              </h2>
              <p className="text-sm sm:text-base text-ink-2 leading-relaxed max-w-xl mx-auto">
                Model batch safety stocks, evaluate Economic Order Quantities, and simulate pharmaceutical replenishment metrics chronologically using historical ledger logs.
              </p>
            </div>

            <div className="w-full max-w-3xl">
              <FileUploader
                onDataLoaded={handleDataLoaded}
                onSampleLoaded={handleDataLoaded}
              />
            </div>
          </div>
        ) : (
          /* Dashboard Workbench View */
          <div className="space-y-8 animate-fade-in">
            {/* Workbench Sub-Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-paper-2 border border-rule p-5 rounded-md">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-ink-2 font-body font-medium mb-1">
                  <span>Inventory Health Workspace</span>
                  <ChevronRight className="w-3 h-3 text-rule-hover" />
                  <span className="text-accent font-semibold">Ready</span>
                </div>
                <h2 className="text-xl font-display font-semibold text-ink tracking-tight">
                  Procurement Decision Panel
                </h2>
              </div>
              <button
                onClick={handleReset}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-paper-3 hover:bg-paper-2 border border-rule hover:border-rule-hover text-ink text-xs font-medium rounded-md transition-all duration-150 focus-visible:outline-2 focus-visible:outline-accent"
              >
                <RefreshCw className="w-3.5 h-3.5 text-ink-2" />
                Upload New Data
              </button>
            </div>

            {/* Metrics Breakdown Cards */}
            <KPICards data={simulationData} />

            {/* Data Visualizations */}
            <AnalyticsCharts data={simulationData} />

            {/* Interactive Workspace Data Tables */}
            <DashboardTabs data={simulationData} />
          </div>
        )}
      </main>

      {/* Footer (Ft2 Inline Restrained) */}
      <footer className="border-t border-rule py-6 bg-paper-2/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-ink-2 font-body">
          <p>© 2026 Ageis Flow. Seeded FEFO Warehouse & Demand Forecast Simulation.</p>
          <p className="text-right">
            Expiry Horizon: 120 Days | Safety Buffer: 20% | Sim Date: {simDate}
          </p>
        </div>
      </footer>
    </div>
  );
}
