import React, { useState, useMemo } from "react";
import { 
  Search, Download, ChevronLeft, ChevronRight, ArrowUpDown, 
  ShieldAlert, ShoppingCart, Ban, Scroll, TrendingUp, 
  DollarSign, Coins, Sliders, PiggyBank, CalendarDays 
} from "lucide-react";

export default function DashboardTabs({ data }) {
  console.log("DashboardTabs received data:", data.length, "records");
  
  const [activeTab, setActiveTab] = useState("procurement");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filter Data according to active tab
  const tabFilteredData = useMemo(() => {
    console.log("Filtering data for tab:", activeTab);
    let filtered;
    switch (activeTab) {
      case "procurement":
        filtered = data.filter((item) => item.Action.includes("RESTOCK"));
        console.log("Procurement filter result:", filtered.length, "items");
        return filtered;
      case "overstock":
        filtered = data.filter((item) => item.Action.includes("EXCESSIVE"));
        console.log("Overstock filter result:", filtered.length, "items");
        return filtered;
      case "expiry":
        filtered = data.filter((item) => (item["Risky Stock (Near Expiry)"] || 0) > 0 || (item["Expired Stock"] || 0) > 0);
        console.log("Expiry filter result:", filtered.length, "items");
        return filtered;
      case "profitability":
      case "eoq":
      case "ledger":
      default:
        console.log("No filter applied, returning all data:", data.length, "items");
        return data;
    }
  }, [data, activeTab]);

  // Apply Search Query on Tab-filtered data
  const searchedData = useMemo(() => {
    setCurrentPage(1); // Reset to page 1 when search changes
    if (!searchQuery.trim()) return tabFilteredData;
    
    const query = searchQuery.toLowerCase();
    return tabFilteredData.filter((item) =>
      item["Product Name"].toLowerCase().includes(query)
    );
  }, [tabFilteredData, searchQuery]);

  // Apply Sorting
  const sortedData = useMemo(() => {
    const sortable = [...searchedData];
    if (sortConfig.key !== null) {
      sortable.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    } else if (activeTab === "procurement") {
      sortable.sort((a, b) => b["Predicted Demand (Next Month)"] - a["Predicted Demand (Next Month)"]);
    }
    return sortable;
  }, [searchedData, sortConfig, activeTab]);

  // Paginate sorted data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const result = sortedData.slice(startIndex, startIndex + itemsPerPage);
    console.log(`Pagination: page ${currentPage}, items ${startIndex + 1}-${startIndex + result.length} of ${sortedData.length} total`);
    return result;
  }, [sortedData, currentPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage) || 1;
  console.log(`Total pages: ${totalPages}, items per page: ${itemsPerPage}`);

  // --- Aggregate Metrics for Top Sections ---
  
  // 2. Profitability Aggregates
  const profitabilityMetrics = useMemo(() => {
    let totalRevenue = 0;
    let totalProfit = 0;
    data.forEach((item) => {
      totalRevenue += item["Revenue"] || 0;
      totalProfit += item["Profit"] || 0;
    });
    const averageMargin = data.length > 0 
      ? data.reduce((sum, item) => sum + (item["Profit Margin (%)"] || 0), 0) / data.length 
      : 0;

    return { totalRevenue, totalProfit, averageMargin };
  }, [data]);

  // 3. EOQ Aggregates
  const eoqMetrics = useMemo(() => {
    let totalEoqSavings = 0;
    let totalIntervals = 0;
    let itemsWithInterval = 0;
    
    data.forEach((item) => {
      totalEoqSavings += item["Annual Cost Savings"] || 0;
      if (item["Days Between Orders"] > 0) {
        totalIntervals += item["Days Between Orders"];
        itemsWithInterval += 1;
      }
    });

    const avgInterval = itemsWithInterval > 0 ? totalIntervals / itemsWithInterval : 0;
    return { totalEoqSavings, avgInterval };
  }, [data]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const exportToCSV = () => {
    if (sortedData.length === 0) return;

    const headers = Object.keys(sortedData[0]);
    const csvRows = [];

    csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","));

    sortedData.forEach(row => {
      const values = headers.map(header => {
        const val = row[header];
        return `"${String(val).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pharma_${activeTab}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action) => {
    if (action.includes("RESTOCK")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-body font-medium bg-red-500/10 text-red-500 border border-red-500/20">
          RESTOCK
        </span>
      );
    }
    if (action.includes("EXCESSIVE")) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-body font-medium bg-orange-500/10 text-orange-500 border border-orange-500/20">
          OVERSTOCK
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-body font-medium bg-green-500/10 text-green-500 border border-green-500/20">
        OPTIMAL
      </span>
    );
  };

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap border-b border-rule gap-1">
        <button
          onClick={() => { setActiveTab("procurement"); setSearchQuery(""); setSortConfig({ key: null, direction: "asc" }); }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-body font-medium border-b-2 transition-all duration-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent relative ${
            activeTab === "procurement"
              ? "border-red-500 text-red-500 bg-red-500/5"
              : "border-transparent text-ink-2 hover:text-ink hover:bg-paper-2/40"
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Procurement
          {data.filter((item) => item.Action.includes("RESTOCK")).length > 0 && (
            <span className="px-1.5 py-0.5 rounded-sm text-xs font-body bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {data.filter((item) => item.Action.includes("RESTOCK")).length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab("overstock"); setSearchQuery(""); setSortConfig({ key: null, direction: "asc" }); }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-body font-medium border-b-2 transition-all duration-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent relative ${
            activeTab === "overstock"
              ? "border-orange-500 text-orange-500 bg-orange-500/5"
              : "border-transparent text-ink-2 hover:text-ink hover:bg-paper-2/40"
          }`}
        >
          <Ban className="w-3.5 h-3.5" />
          Overstock
          {data.filter((item) => item.Action.includes("EXCESSIVE")).length > 0 && (
            <span className="px-1.5 py-0.5 rounded-sm text-xs font-body bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {data.filter((item) => item.Action.includes("EXCESSIVE")).length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab("expiry"); setSearchQuery(""); setSortConfig({ key: null, direction: "asc" }); }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-body font-medium border-b-2 transition-all duration-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent relative ${
            activeTab === "expiry"
              ? "border-rose-500 text-rose-500 bg-rose-500/5"
              : "border-transparent text-ink-2 hover:text-ink hover:bg-paper-2/40"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Expiry Risk
          {data.filter((item) => (item["Risky Stock (Near Expiry)"] || 0) > 0 || (item["Expired Stock"] || 0) > 0).length > 0 && (
            <span className="px-1.5 py-0.5 rounded-sm text-xs font-body bg-rose-500/10 text-rose-400 border border-rose-500/20">
              {data.filter((item) => (item["Risky Stock (Near Expiry)"] || 0) > 0 || (item["Expired Stock"] || 0) > 0).length}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab("profitability"); setSearchQuery(""); setSortConfig({ key: null, direction: "asc" }); }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-body font-medium border-b-2 transition-all duration-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent relative ${
            activeTab === "profitability"
              ? "border-blue-500 text-blue-500 bg-blue-500/5"
              : "border-transparent text-ink-2 hover:text-ink hover:bg-paper-2/40"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Profitability
        </button>

        <button
          onClick={() => { setActiveTab("eoq"); setSearchQuery(""); setSortConfig({ key: null, direction: "asc" }); }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-body font-medium border-b-2 transition-all duration-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent relative ${
            activeTab === "eoq"
              ? "border-cyan-500 text-cyan-500 bg-cyan-500/5"
              : "border-transparent text-ink-2 hover:text-ink hover:bg-paper-2/40"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          EOQ Model
        </button>

        <button
          onClick={() => { setActiveTab("ledger"); setSearchQuery(""); setSortConfig({ key: null, direction: "asc" }); }}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-body font-medium border-b-2 transition-all duration-300 cursor-pointer focus-visible:outline-2 focus-visible:outline-accent relative ${
            activeTab === "ledger"
              ? "border-green-500 text-green-500 bg-green-500/5"
              : "border-transparent text-ink-2 hover:text-ink hover:bg-paper-2/40"
          }`}
        >
          <Scroll className="w-3.5 h-3.5" />
          Master Ledger
        </button>
      </div>

      {/* Aggregate Banners */}
      
      {/* EOQ Savings Banner - only shows on EOQ tab */}
      {activeTab === "eoq" && eoqMetrics.totalEoqSavings > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-md bg-accent/5 border border-accent/15 text-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 border border-accent/25 rounded-md text-accent">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <span className="font-display font-bold text-ink block">Economic Order Quantity (EOQ) Active</span>
              <span className="text-xs text-ink-2">Recommended replenishment volumes calculated to minimize holding friction.</span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs font-body font-medium text-ink-2 block mb-1">Annual Cost Savings</span>
            <span className="text-xl font-display font-bold text-accent tnum tracking-tight">
              ₹{eoqMetrics.totalEoqSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* Profitability aggregates */}
      {activeTab === "profitability" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
          <div className="bg-paper-2 border border-rule p-4 rounded-md flex items-center justify-between">
            <div>
              <span className="text-xs font-body font-medium text-ink-2 block mb-1">Projected Revenue</span>
              <span className="text-lg font-display font-semibold text-ink tnum">
                ₹{profitabilityMetrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-2 bg-paper-3 border border-rule rounded-md text-ink-2">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-paper-2 border border-rule p-4 rounded-md flex items-center justify-between">
            <div>
              <span className="text-xs font-body font-medium text-ink-2 block mb-1">Projected Annual Profit</span>
              <span className="text-lg font-display font-semibold text-ink tnum">
                ₹{profitabilityMetrics.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-2 bg-paper-3 border border-rule rounded-md text-ink-2">
              <Coins className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-paper-2 border border-rule p-4 rounded-md flex items-center justify-between">
            <div>
              <span className="text-xs font-body font-medium text-ink-2 block mb-1">Average Profit Margin</span>
              <span className="text-lg font-display font-semibold text-ink tnum">
                {profitabilityMetrics.averageMargin.toFixed(1)}%
              </span>
            </div>
            <div className="p-2 bg-paper-3 border border-rule rounded-md text-ink-2">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* EOQ aggregates */}
      {activeTab === "eoq" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
          <div className="bg-paper-2 border border-rule p-4 rounded-md flex items-center justify-between">
            <div>
              <span className="text-xs font-body font-medium text-ink-2 block mb-1">Potential EOQ Savings</span>
              <span className="text-lg font-display font-semibold text-accent tnum">
                ₹{eoqMetrics.totalEoqSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="p-2 bg-paper-3 border border-rule rounded-md text-accent">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-paper-2 border border-rule p-4 rounded-md flex items-center justify-between">
            <div>
              <span className="text-xs font-body font-medium text-ink-2 block mb-1">Avg Reorder Interval</span>
              <span className="text-lg font-display font-semibold text-ink tnum">
                {Math.round(eoqMetrics.avgInterval)} days
              </span>
            </div>
            <div className="p-2 bg-paper-3 border border-rule rounded-md text-ink-2">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-paper-2 border border-rule p-4 rounded-md flex items-center justify-between">
            <div>
              <span className="text-xs font-body font-medium text-ink-2 block mb-1">Optimization Constants</span>
              <span className="text-xs text-ink-2 block mt-1 font-body">
                Order Fee: <span className="text-accent">₹50</span> | Holding: <span className="text-accent">20%</span>
              </span>
            </div>
            <div className="p-2 bg-paper-3 border border-rule rounded-md text-ink-2">
              <Sliders className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Table Filters Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Search Input Box */}
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-2" />
          <input
            type="text"
            placeholder="Filter catalog by product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-paper-2 hover:bg-paper-3/50 focus:bg-paper border border-rule focus:border-accent text-ink placeholder-ink-2/50 text-xs rounded-md focus:outline-none transition duration-150 focus-visible:outline-accent"
          />
        </div>

        {/* Export Button */}
        <button
          onClick={exportToCSV}
          disabled={sortedData.length === 0}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-paper-3 hover:bg-paper-2 border border-rule hover:border-rule-hover disabled:opacity-40 disabled:cursor-not-allowed text-ink text-xs font-display font-semibold rounded-md transition duration-150 active:scale-[0.98] cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-ink-2" />
          Export to CSV
        </button>
      </div>

      {/* Main Data Table */}
      <div className="bg-paper-2 border border-rule rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-paper-3/50 text-ink-2 border-b border-rule font-body uppercase">
              {activeTab === "procurement" && (
                <tr>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink" onClick={() => requestSort("Product Name")}>
                    <div className="flex items-center gap-1">Product Name <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Avg Monthly Sales")}>
                    <div className="flex items-center justify-end gap-1">Avg Sales <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right font-bold text-accent" onClick={() => requestSort("Predicted Demand (Next Month)")}>
                    <div className="flex items-center justify-end gap-1 text-accent">Demand Forecast <ArrowUpDown className="w-3 h-3 text-accent/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Usable Stock")}>
                    <div className="flex items-center justify-end gap-1">Usable Stock <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Reorder Point (ROP)")}>
                    <div className="flex items-center justify-end gap-1">ROP <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right font-bold text-rose-400" onClick={() => requestSort("Units to Buy")}>
                    <div className="flex items-center justify-end gap-1 text-rose-400 font-bold">Units to Buy <ArrowUpDown className="w-3 h-3 text-rose-500/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right font-bold text-accent" onClick={() => requestSort("EOQ")}>
                    <div className="flex items-center justify-end gap-1 text-accent font-bold">Rec. EOQ <ArrowUpDown className="w-3 h-3 text-accent/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Days Between Orders")}>
                    <div className="flex items-center justify-end gap-1">Order Interval <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                </tr>
              )}

              {activeTab === "overstock" && (
                <tr>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink" onClick={() => requestSort("Product Name")}>
                    <div className="flex items-center gap-1">Product Name <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Avg Monthly Sales")}>
                    <div className="flex items-center justify-end gap-1">Avg Sales <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Predicted Demand (Next Month)")}>
                    <div className="flex items-center justify-end gap-1">Demand <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Usable Stock")}>
                    <div className="flex items-center justify-end gap-1">Usable Stock <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Total Stock")}>
                    <div className="flex items-center justify-end gap-1">Total Stock <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-center" onClick={() => requestSort("Nearest Expiry Date")}>
                    <div className="flex items-center justify-center gap-1">Nearest Expiry <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-center" onClick={() => requestSort("Action")}>
                    <div className="flex items-center justify-center gap-1">Status <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                </tr>
              )}

              {activeTab === "expiry" && (
                <tr>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink" onClick={() => requestSort("Product Name")}>
                    <div className="flex items-center gap-1">Product Name <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Usable Stock")}>
                    <div className="flex items-center justify-end gap-1">Usable Stock <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right font-bold text-amber-400" onClick={() => requestSort("Risky Stock (Near Expiry)")}>
                    <div className="flex items-center justify-end gap-1 text-amber-400">Risky Stock (Near Expiry) <ArrowUpDown className="w-3 h-3 text-amber-500/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right font-bold text-rose-400" onClick={() => requestSort("Expired Stock")}>
                    <div className="flex items-center justify-end gap-1 text-rose-400">Expired Stock <ArrowUpDown className="w-3 h-3 text-rose-500/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Total Stock")}>
                    <div className="flex items-center justify-end gap-1">Total Stock <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-center" onClick={() => requestSort("Nearest Expiry Date")}>
                    <div className="flex items-center justify-center gap-1">Nearest Expiry <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                </tr>
              )}

              {activeTab === "profitability" && (
                <tr>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink" onClick={() => requestSort("Product Name")}>
                    <div className="flex items-center gap-1">Product Name <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right font-semibold text-accent" onClick={() => requestSort("Purchase Cost")}>
                    <div className="flex items-center justify-end gap-1 text-accent">Purchase Cost <ArrowUpDown className="w-3 h-3 text-accent/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right font-bold text-accent" onClick={() => requestSort("Selling Price")}>
                    <div className="flex items-center justify-end gap-1 text-accent">Selling Price <ArrowUpDown className="w-3 h-3 text-accent/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Annual Demand")}>
                    <div className="flex items-center justify-end gap-1">Annual Units <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right font-bold text-accent" onClick={() => requestSort("Revenue")}>
                    <div className="flex items-center justify-end gap-1 text-accent">Est. Revenue <ArrowUpDown className="w-3 h-3 text-accent/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right font-bold text-accent" onClick={() => requestSort("Profit")}>
                    <div className="flex items-center justify-end gap-1 text-accent">Est. Net Profit <ArrowUpDown className="w-3 h-3 text-accent/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Profit Margin (%)")}>
                    <div className="flex items-center justify-end gap-1">Margin % <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                </tr>
              )}

              {activeTab === "eoq" && (
                <tr>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink" onClick={() => requestSort("Product Name")}>
                    <div className="flex items-center gap-1">Product Name <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Annual Demand")}>
                    <div className="flex items-center justify-end gap-1">Annual Demand (D) <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Purchase Cost")}>
                    <div className="flex items-center justify-end gap-1">Purchase Cost <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Purchase Cost")}>
                    <div className="flex items-center justify-end gap-1">Holding Cost (H) <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right font-bold text-accent" onClick={() => requestSort("EOQ")}>
                    <div className="flex items-center justify-end gap-1 text-accent font-bold">Optimal Order Size <ArrowUpDown className="w-3 h-3 text-accent/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Days Between Orders")}>
                    <div className="flex items-center justify-end gap-1">Interval (Days) <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right font-bold text-accent" onClick={() => requestSort("Annual Cost Savings")}>
                    <div className="flex items-center justify-end gap-1 text-accent font-bold">Annual Savings <ArrowUpDown className="w-3 h-3 text-accent/60" /></div>
                  </th>
                </tr>
              )}

              {activeTab === "ledger" && (
                <tr>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink" onClick={() => requestSort("Product Name")}>
                    <div className="flex items-center gap-1">Product Name <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Avg Monthly Sales")}>
                    <div className="flex items-center justify-end gap-1">Avg Sales <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Predicted Demand (Next Month)")}>
                    <div className="flex items-center justify-end gap-1">Demand <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Usable Stock")}>
                    <div className="flex items-center justify-end gap-1">Usable Stock <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Selling Price")}>
                    <div className="flex items-center justify-end gap-1">Price <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Profit Margin (%)")}>
                    <div className="flex items-center justify-end gap-1">Margin <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("EOQ")}>
                    <div className="flex items-center justify-end gap-1">EOQ <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right" onClick={() => requestSort("Days Between Orders")}>
                    <div className="flex items-center justify-end gap-1">Interval <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-center" onClick={() => requestSort("Action")}>
                    <div className="flex items-center justify-center gap-1">Status <ArrowUpDown className="w-3 h-3 text-ink-2/60" /></div>
                  </th>
                  <th className="py-3.5 px-5 cursor-pointer hover:text-ink text-right font-bold text-rose-400" onClick={() => requestSort("Units to Buy")}>
                    <div className="flex items-center justify-end gap-1 text-rose-400 font-bold">Buy <ArrowUpDown className="w-3 h-3 text-rose-500/60" /></div>
                  </th>
                </tr>
              )}
            </thead>
            
            <tbody className="divide-y divide-rule/50 font-body">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-ink-2 text-xs">
                    No matching products found.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => (
                  <tr
                    key={index}
                    className="hover:bg-paper-3/30 transition-colors duration-150 group"
                  >
                    {activeTab === "procurement" && (
                      <>
                        <td className="py-3.5 px-5 font-display font-semibold text-ink group-hover:text-accent transition-colors">
                          {item["Product Name"]}
                        </td>
                        <td className="py-3.5 px-5 text-right tnum text-ink-2">{item["Avg Monthly Sales"]}</td>
                        <td className="py-3.5 px-5 text-right tnum font-bold text-accent bg-accent/5">{item["Predicted Demand (Next Month)"]}</td>
                        <td className="py-3.5 px-5 text-right tnum text-ink-2">{item["Usable Stock"]}</td>
                        <td className="py-3.5 px-5 text-right tnum text-ink-2/70">{item["Reorder Point (ROP)"]}</td>
                        <td className="py-3.5 px-5 text-right tnum font-bold text-rose-400 bg-rose-500/5">
                          {item["Units to Buy"]}
                        </td>
                        <td className="py-3.5 px-5 text-right tnum font-bold text-accent bg-accent/5">
                          {item["EOQ"]}
                        </td>
                        <td className="py-3.5 px-5 text-right tnum text-accent bg-accent/5">
                          {item["Days Between Orders"]}d
                        </td>
                      </>
                    )}

                    {activeTab === "overstock" && (
                      <>
                        <td className="py-3.5 px-5 font-display font-semibold text-ink group-hover:text-accent transition-colors">
                          {item["Product Name"]}
                        </td>
                        <td className="py-3.5 px-5 text-right tnum text-ink-2">{item["Avg Monthly Sales"]}</td>
                        <td className="py-3.5 px-5 text-right tnum text-ink-2">{item["Predicted Demand (Next Month)"]}</td>
                        <td className="py-3.5 px-5 text-right tnum text-amber-400/80">{item["Usable Stock"]}</td>
                        <td className="py-3.5 px-5 text-right tnum font-bold text-amber-400 bg-amber-500/5">{item["Total Stock"]}</td>
                        <td className="py-3.5 px-5 text-center tnum text-ink-2/70">{item["Nearest Expiry Date"]}</td>
                        <td className="py-3.5 px-5 text-center">{getActionBadge(item.Action)}</td>
                      </>
                    )}

                    {activeTab === "expiry" && (
                      <>
                        <td className="py-3.5 px-5 font-display font-semibold text-ink group-hover:text-accent transition-colors">
                          {item["Product Name"]}
                        </td>
                        <td className="py-3.5 px-5 text-right tnum text-ink-2">{item["Usable Stock"]}</td>
                        <td className="py-3.5 px-5 text-right tnum font-bold text-amber-400 bg-amber-500/5">
                          {item["Risky Stock (Near Expiry)"]}
                        </td>
                        <td className="py-3.5 px-5 text-right tnum font-bold text-rose-400 bg-rose-500/5">
                          {item["Expired Stock"] ?? 0}
                        </td>
                        <td className="py-3.5 px-5 text-right tnum text-ink-2">{item["Total Stock"]}</td>
                        <td className="py-3.5 px-5 text-center tnum text-rose-400/90 font-medium">
                          <span className="inline-flex items-center justify-center gap-1.5">
                            {item["Nearest Expiry Date"]}
                            {item["Nearest Expiry Is Past"] && (
                              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                (EXPIRED)
                              </span>
                            )}
                          </span>
                        </td>
                      </>
                    )}

                    {activeTab === "profitability" && (
                      <>
                        <td className="py-3.5 px-5 font-display font-semibold text-ink group-hover:text-accent transition-colors">
                          {item["Product Name"]}
                        </td>
                        <td className="py-3.5 px-5 text-right tnum text-ink-2/70">₹{item["Purchase Cost"].toFixed(2)}</td>
                        <td className="py-3.5 px-5 text-right tnum font-bold text-accent">₹{item["Selling Price"].toFixed(2)}</td>
                        <td className="py-3.5 px-5 text-right tnum text-ink-2">{item["Annual Demand"].toLocaleString()}</td>
                        <td className="py-3.5 px-5 text-right tnum font-bold text-accent bg-accent/5">
                          ₹{(item["Revenue"] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-5 text-right tnum font-bold text-accent bg-accent/5">
                          ₹{(item["Profit"] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-5 text-right tnum">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-bold text-accent">{item["Profit Margin (%)"].toFixed(1)}%</span>
                            <div className="w-12 bg-paper-3 rounded-full h-1 hidden sm:block border border-rule overflow-hidden">
                              <div className="bg-accent h-full rounded-full" style={{ width: `${item["Profit Margin (%)"]}%` }}></div>
                            </div>
                          </div>
                        </td>
                      </>
                    )}

                    {activeTab === "eoq" && (
                      <>
                        <td className="py-3.5 px-5 font-display font-semibold text-ink group-hover:text-accent transition-colors">
                          {item["Product Name"]}
                        </td>
                        <td className="py-3.5 px-5 text-right tnum text-ink-2">{item["Annual Demand"].toLocaleString()} units</td>
                        <td className="py-3.5 px-5 text-right tnum text-ink-2/70">₹{item["Purchase Cost"].toFixed(2)}</td>
                        <td className="py-3.5 px-5 text-right tnum text-ink-2/70">
                          ₹{Math.max(item["Purchase Cost"] * 0.20, 1).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-5 text-right tnum font-bold text-accent bg-accent/5">
                          {item["EOQ"]} units
                        </td>
                        <td className="py-3.5 px-5 text-right tnum font-medium text-accent bg-accent/5">
                          {item["Days Between Orders"]}d
                        </td>
                        <td className="py-3.5 px-5 text-right tnum font-bold text-accent bg-accent/5">
                          ₹{item["Annual Cost Savings"].toFixed(2)}
                        </td>
                      </>
                    )}

                    {activeTab === "ledger" && (
                      <>
                        <td className="py-3.5 px-5 font-display font-semibold text-ink group-hover:text-accent transition-colors">
                          {item["Product Name"]}
                        </td>
                        <td className="py-3.5 px-5 text-right tnum text-ink-2">{item["Avg Monthly Sales"]}</td>
                        <td className="py-3.5 px-5 text-right tnum text-ink-2">{item["Predicted Demand (Next Month)"]}</td>
                        <td className="py-3.5 px-5 text-right tnum text-ink-2">{item["Usable Stock"]}</td>
                        
                        <td className="py-3.5 px-5 text-right tnum text-accent">₹{item["Selling Price"].toFixed(2)}</td>
                        <td className="py-3.5 px-5 text-right tnum text-accent">{item["Profit Margin (%)"].toFixed(1)}%</td>
                        <td className="py-3.5 px-5 text-right tnum text-accent font-semibold">{item["EOQ"]}</td>
                        <td className="py-3.5 px-5 text-right tnum text-accent">{item["Days Between Orders"]}d</td>

                        <td className="py-3.5 px-5 text-center">{getActionBadge(item.Action)}</td>
                        <td className="py-3.5 px-5 text-right tnum font-bold">
                          {item["Units to Buy"] > 0 ? (
                            <span className="text-rose-400">{item["Units to Buy"]}</span>
                          ) : (
                            <span className="text-ink-2/40">-</span>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {sortedData.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 bg-paper-3/30 border-t border-rule text-[11px] text-ink-2">
            <div>
              Showing <span className="font-semibold text-ink">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
              <span className="font-semibold text-ink">
                {Math.min(currentPage * itemsPerPage, sortedData.length)}
              </span>{" "}
              of <span className="font-semibold text-ink">{sortedData.length}</span> entries
            </div>
            
            <div className="flex items-center gap-1.5 font-body">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-sm bg-paper-3 border border-rule hover:border-rule-hover disabled:opacity-30 disabled:hover:border-rule hover:bg-paper-2 transition cursor-pointer active:scale-95 focus-visible:outline-2 focus-visible:outline-accent"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-ink-2" />
              </button>
              
              <span className="px-2.5 py-1 bg-paper-3 border border-rule rounded-sm text-ink font-semibold">
                {currentPage} / {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-sm bg-paper-3 border border-rule hover:border-rule-hover disabled:opacity-30 disabled:hover:border-rule hover:bg-paper-2 transition cursor-pointer active:scale-95 focus-visible:outline-2 focus-visible:outline-accent"
              >
                <ChevronRight className="w-3.5 h-3.5 text-ink-2" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
