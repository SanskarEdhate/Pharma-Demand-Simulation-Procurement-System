import React, { useState, useRef, useMemo } from "react";
import Papa from "papaparse";
import { Upload, FileSpreadsheet, AlertCircle, Database, Check, X, ChevronRight } from "lucide-react";
import { validateHeaders, SAMPLE_DATA, COLUMN_ALIASES } from "../utils/simulation";

export default function FileUploader({ onDataLoaded, onSampleLoaded }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [dataSource, setDataSource] = useState(null);
  const [editingCell, setEditingCell] = useState(null); // { rowIndex, field }
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFile = (file) => {
    console.log("CSV parsing started");
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    if (!file) {
      console.log("No file provided");
      setIsLoading(false);
      return;
    }

    if (!file.name.endsWith(".csv")) {
      console.log("Invalid file format");
      setError("Invalid file format. Please upload a structured CSV (.csv) ledger file.");
      setIsLoading(false);
      return;
    }

    // Add 10-second timeout fallback
    const timeoutId = setTimeout(() => {
      console.error("CSV parsing timeout - 10 seconds exceeded");
      setError("CSV processing failed. Please check file format.");
      setIsLoading(false);
    }, 10000);

    // Simulate 400ms load delay to show loading state
    setTimeout(() => {
      console.log("Starting CSV parsing with PapaParse");
      Papa.parse(file, {
        header: true,
        skipEmptyLines: "greedy",
        dynamicTyping: false,
        transformHeader: (header) => (header ? header.trim().replace(/^[\uFEFF\xA0]+/, "") : ""),
        complete: (results) => {
          clearTimeout(timeoutId);
          console.log("CSV parsing completed", results);

          let data = results.data || [];
          let headers = results.meta.fields || [];

          // Clean up headers: flatten arrays or extract strings
          headers = headers
            .filter(h => h != null)
            .map(h => (Array.isArray(h) ? h.join(" ").trim() : String(h).trim()));

          // If rows came back as arrays (misconfigured header detection or raw rows)
          if (data.length > 0 && Array.isArray(data[0])) {
            if (headers.length === 0 || headers.length !== data[0].length) {
              headers = data[0].map(h => String(h || "").trim());
              data = data.slice(1);
            }
            data = data.map(row => {
              const rowObj = {};
              headers.forEach((colName, idx) => {
                rowObj[colName] = row[idx];
              });
              return rowObj;
            });
          }

          console.log("Normalized headers found:", headers);

          if (!validateHeaders(headers)) {
            console.log("Validation failed - missing required headers");
            setError(
              "Schema mismatch. Required headers: 'Product Name', 'Quantity', 'Month', 'Year' (or common aliases like Product, Qty, etc.)."
            );
            setIsLoading(false);
            return;
          }

          if (data.length === 0) {
            console.log("Validation failed - no data records");
            setError("The uploaded CSV document contains no data records.");
            setIsLoading(false);
            return;
          }

          console.log("Validation completed, setting preview data for", data.length, "rows");
          setSuccess(true);
          setIsLoading(false);
          setPreviewData(data);
          setDataSource("CSV Upload");
        },
        error: (err) => {
          clearTimeout(timeoutId);
          console.error("PapaParse error:", err);
          setError("Parsing engine failed: " + err.message);
          setIsLoading(false);
        },
      });
    }, 400);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    if (!isLoading && !success && !previewData) {
      fileInputRef.current.click();
    }
  };

  const handleConfirmPreview = () => {
    console.log("Continue to Dashboard clicked");
    if (previewData) {
      console.log("Calling onDataLoaded with", previewData.length, "rows");
      onDataLoaded(previewData);
      console.log("Moving to dashboard");
    } else {
      console.error("No preview data available");
    }
  };

  const handleCancelPreview = () => {
    setPreviewData(null);
    setDataSource(null);
    setSuccess(false);
    setError(null);
    setEditingCell(null);
  };

  const handleCellEdit = (rowIndex, field, value) => {
    const updatedData = [...previewData];
    const row = updatedData[rowIndex];
    const aliases = (COLUMN_ALIASES && COLUMN_ALIASES[field]) || [field.toLowerCase()];
    let actualKey = null;
    for (const key in row) {
      if (aliases.includes(key.toLowerCase())) {
        actualKey = key;
        break;
      }
    }
    if (actualKey) {
      updatedData[rowIndex][actualKey] = value;
    } else {
      updatedData[rowIndex][field] = value;
    }
    setPreviewData(updatedData);
  };

  const startEditing = (rowIndex, field) => {
    setEditingCell({ rowIndex, field });
  };

  const stopEditing = () => {
    setEditingCell(null);
  };

  // Helper function to get value from row with alias & case-insensitive matching
  const getRowValue = (row, keyName) => {
    if (!row || typeof row !== "object") return "";
    const aliases = (COLUMN_ALIASES && COLUMN_ALIASES[keyName]) || [keyName.toLowerCase()];
    for (const key in row) {
      const cleanKey = key.trim().toLowerCase();
      if (aliases.includes(cleanKey)) {
        return row[key] !== undefined && row[key] !== null ? row[key] : "";
      }
    }
    return "";
  };

  // Calculate preview metadata
  const previewMetadata = useMemo(() => {
    if (!previewData || previewData.length === 0) return null;
    
    console.log("Calculating preview metadata for", previewData.length, "rows");
    
    const uniqueProducts = new Set(
      previewData.map(item => getRowValue(item, "Product Name")).filter(Boolean)
    ).size;
    const months = new Set(
      previewData.map(item => getRowValue(item, "Month")).filter(Boolean)
    ).size;
    const years = new Set(
      previewData.map(item => getRowValue(item, "Year")).filter(Boolean)
    ).size;
    
    console.log("Metadata calculated:", { uniqueProducts, monthCount: months, yearCount: years });
    
    return {
      rowCount: previewData.length,
      uniqueProducts,
      monthCount: months,
      yearCount: years
    };
  }, [previewData]);

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      {/* Drop Zone Box - hidden when preview is active */}
      {!previewData && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              triggerFileInput();
            }
          }}
          className={`relative flex flex-col items-center justify-center w-full min-h-[260px] border border-dashed rounded-md cursor-pointer transition-all duration-200 focus-visible:outline-2 focus-visible:outline-accent outline-offset-4 ${
            isDragActive
              ? "border-accent bg-accent/5"
              : success
              ? "border-accent bg-accent/5 cursor-default"
              : isLoading
              ? "border-rule bg-paper-2/30 cursor-wait"
              : "border-rule bg-paper-2/40 hover:bg-paper-2 hover:border-rule-hover active:scale-[0.99]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="sr-only"
            onChange={handleFileInput}
            disabled={isLoading || success}
          />

          <div className="flex flex-col items-center justify-center p-6 text-center">
            {success ? (
              /* Success State */
              <div className="flex flex-col items-center animate-fade-in">
                <div className="p-3 bg-accent/10 text-accent rounded-full mb-3 border border-accent/20">
                  <Check className="w-8 h-8" />
                </div>
                <p className="text-lg font-display font-semibold text-ink">Ledger Verified</p>
                <p className="text-xs text-ink-2 font-body mt-1">Preparing preview...</p>
              </div>
            ) : isLoading ? (
              /* Loading State */
              <div className="flex flex-col items-center animate-fade-in">
                <div className="relative w-8 h-8 mb-3">
                  <div className="absolute inset-0 border-2 border-accent/15 rounded-full"></div>
                  <div className="absolute inset-0 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-sm font-body font-medium text-ink">Parsing File Contents</p>
                <p className="text-xs text-ink-2 font-body mt-1">Validating ledger columns & structures</p>
              </div>
            ) : (
              /* Default / Hover / Active States */
              <>
                <div className={`p-3 rounded-md mb-4 border transition-colors ${
                  isDragActive ? "bg-accent/15 text-accent border-accent/30" : "bg-paper-3 text-ink-2 border-rule"
                }`}>
                  <Upload className="w-6 h-6" />
                </div>
                <p className="mb-1 text-sm font-body font-medium text-ink">
                  Drag & drop warehouse CSV ledger
                </p>
                <p className="mb-6 text-xs text-ink-2">
                  or <span className="text-accent hover:underline font-medium focus-visible:outline-1">browse local disk</span>
                </p>
                
                {/* Badge specifications */}
                <div className="flex flex-wrap justify-center gap-2 max-w-md pt-4 border-t border-rule/50">
                  {["Product Name", "Quantity", "Month", "Year"].map((col) => (
                    <span
                      key={col}
                      className="inline-flex items-center px-2 py-1 rounded-sm text-xs font-body font-medium bg-paper-2 border border-rule text-ink-2"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-md bg-accent/5 border border-accent/20 text-accent text-xs font-body leading-relaxed animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">VALIDATION_ERROR:</span> {error}
          </div>
        </div>
      )}

      {/* Preview Panel */}
      {previewData && previewMetadata && (
        <div className="bg-paper-2 border border-rule rounded-md overflow-hidden animate-fade-in">
          {/* Preview Header */}
          <div className="flex items-center justify-between p-4 border-b border-rule bg-paper-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 text-accent rounded-md border border-accent/20">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-display font-semibold text-ink">{dataSource}</p>
                <p className="text-xs text-ink-2 font-body">
                  {previewMetadata.rowCount} rows · {previewMetadata.uniqueProducts} products · {previewMetadata.monthCount} months · {previewMetadata.yearCount} years
                </p>
              </div>
            </div>
            <button
              onClick={handleCancelPreview}
              className="p-2 hover:bg-paper-2 rounded-md text-ink-2 hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-accent"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preview Table */}
          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs font-body">
              <thead className="bg-paper-3 sticky top-0">
                <tr>
                  {["Product Name", "Quantity", "Month", "Year"].map((col) => (
                    <th key={col} className="py-2 px-4 text-left font-semibold text-ink border-b border-rule">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rule/50">
                {previewData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-paper-3/30 transition-colors">
                    <td 
                      className="py-2 px-4 text-ink cursor-pointer hover:bg-paper-2/50 rounded"
                      onClick={() => startEditing(idx, "Product Name")}
                    >
                      {editingCell?.rowIndex === idx && editingCell?.field === "Product Name" ? (
                        <input
                          type="text"
                          autoFocus
                          defaultValue={getRowValue(row, "Product Name")}
                          onBlur={(e) => {
                            handleCellEdit(idx, "Product Name", e.target.value);
                            stopEditing();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleCellEdit(idx, "Product Name", e.target.value);
                              stopEditing();
                            } else if (e.key === "Escape") {
                              stopEditing();
                            }
                          }}
                          className="w-full bg-paper text-ink text-xs font-body py-1 px-2 rounded border border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      ) : (
                        <span className="flex items-center gap-2">
                          {getRowValue(row, "Product Name")}
                          <span className="text-ink-2/40 text-[10px]">✎</span>
                        </span>
                      )}
                    </td>
                    <td 
                      className="py-2 px-4 text-ink-2 tnum cursor-pointer hover:bg-paper-2/50 rounded"
                      onClick={() => startEditing(idx, "Quantity")}
                    >
                      {editingCell?.rowIndex === idx && editingCell?.field === "Quantity" ? (
                        <input
                          type="number"
                          autoFocus
                          defaultValue={getRowValue(row, "Quantity")}
                          onBlur={(e) => {
                            handleCellEdit(idx, "Quantity", e.target.value);
                            stopEditing();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleCellEdit(idx, "Quantity", e.target.value);
                              stopEditing();
                            } else if (e.key === "Escape") {
                              stopEditing();
                            }
                          }}
                          className="w-full bg-paper text-ink text-xs font-body py-1 px-2 rounded border border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      ) : (
                        <span className="flex items-center gap-2">
                          {getRowValue(row, "Quantity")}
                          <span className="text-ink-2/40 text-[10px]">✎</span>
                        </span>
                      )}
                    </td>
                    <td 
                      className="py-2 px-4 text-ink-2 cursor-pointer hover:bg-paper-2/50 rounded"
                      onClick={() => startEditing(idx, "Month")}
                    >
                      {editingCell?.rowIndex === idx && editingCell?.field === "Month" ? (
                        <input
                          type="text"
                          autoFocus
                          defaultValue={getRowValue(row, "Month")}
                          onBlur={(e) => {
                            handleCellEdit(idx, "Month", e.target.value);
                            stopEditing();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleCellEdit(idx, "Month", e.target.value);
                              stopEditing();
                            } else if (e.key === "Escape") {
                              stopEditing();
                            }
                          }}
                          className="w-full bg-paper text-ink text-xs font-body py-1 px-2 rounded border border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      ) : (
                        <span className="flex items-center gap-2">
                          {getRowValue(row, "Month")}
                          <span className="text-ink-2/40 text-[10px]">✎</span>
                        </span>
                      )}
                    </td>
                    <td 
                      className="py-2 px-4 text-ink-2 tnum cursor-pointer hover:bg-paper-2/50 rounded"
                      onClick={() => startEditing(idx, "Year")}
                    >
                      {editingCell?.rowIndex === idx && editingCell?.field === "Year" ? (
                        <input
                          type="number"
                          autoFocus
                          defaultValue={getRowValue(row, "Year")}
                          onBlur={(e) => {
                            handleCellEdit(idx, "Year", e.target.value);
                            stopEditing();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleCellEdit(idx, "Year", e.target.value);
                              stopEditing();
                            } else if (e.key === "Escape") {
                              stopEditing();
                            }
                          }}
                          className="w-full bg-paper text-ink text-xs font-body py-1 px-2 rounded border border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      ) : (
                        <span className="flex items-center gap-2">
                          {getRowValue(row, "Year")}
                          <span className="text-ink-2/40 text-[10px]">✎</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Preview Actions */}
          <div className="flex items-center justify-between p-4 border-t border-rule bg-paper-3">
            <button
              onClick={handleCancelPreview}
              className="flex items-center gap-2 px-4 py-2 bg-paper hover:bg-paper-2 border border-rule hover:border-rule-hover text-ink text-xs font-body font-medium rounded-md transition-all focus-visible:outline-2 focus-visible:outline-accent"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmPreview}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs font-display font-semibold rounded-md shadow-sm hover:shadow-md transition-all duration-200 focus-visible:outline-2 focus-visible:outline-green-500 active:scale-95"
            >
              Continue to Dashboard
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Optional action triggers (Demo DB) - hidden when preview is active */}
      {!previewData && (
        <div className="mt-4 flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2 w-full max-w-xs">
            <div className="h-px flex-grow bg-rule/50"></div>
            <span className="text-xs text-ink-2 font-body font-medium">Alternative Source</span>
            <div className="h-px flex-grow bg-rule/50"></div>
          </div>
          
          <button
            onClick={() => {
              if (!isLoading && !success) {
                console.log("Load Seeded Database clicked");
                setPreviewData(SAMPLE_DATA);
                setDataSource("Seeded Database — 8 clinical formulations, Sep-Dec 2020");
                setSuccess(true);
                console.log("Seeded data loaded, preview should show");
              }
            }}
            disabled={isLoading || success}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-accent-ink text-xs font-display font-semibold rounded-md shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-accent active:scale-95 cursor-pointer"
          >
            <Database className="w-4 h-4" />
            Load Seeded Database
          </button>
          <p className="text-xs text-ink-2 font-body">
            Preloaded with 8 clinical formulations (Sep-Dec 2020)
          </p>
        </div>
      )}
    </div>
  );
}
