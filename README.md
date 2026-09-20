# Pharma Demand Simulation & Procurement Engine

A pharmaceutical inventory management and procurement decision support system built with React, Vite, Tailwind CSS, and Recharts. This application models batch safety stocks, evaluates Economic Order Quantities (EOQ), and simulates pharmaceutical replenishment metrics using historical sales ledgers with First-Expire-First-Out (FEFO) logic.

---

## Features

### 🎯 Core Simulation Engine

- **FEFO Batch Expiration Simulation**:
  - **Data-Anchored Expiry Dates**: Each formulation's lot expiry dates are calculated relative to that product's own most recent historical ledger data point.
  - **Three-Tier Expiry Categorization**:
    - **Usable Stock**: Lots with > 120 days of shelf life remaining relative to the simulation date.
    - **Risky Stock (Near Expiry)**: Lots with 0 to 120 days remaining until expiry.
    - **Expired Stock**: Batches whose expiry date has passed the current simulation clock (`< 0 days`).
  - **Overdue Expiry Flagging**: Automatically flags overdue batches with `(EXPIRED)` indicators.

- **Dynamic As-Of Simulation Date**:
  - Automatically initializes to the real current date (today) upon loading.
  - Fully interactive `SimulationDatePicker` in the header allows stepping forward or backward in time to evaluate historical or projected warehouse states.

- **Demand Forecasting**:
  - Uses weighted moving averages (`0.2`, `0.3`, `0.5` weights) to forecast next-month demand based on the last 3 months of sales.
  - Falls back gracefully to simple average when fewer than 3 historical periods are available.

- **Economic Order Quantity (EOQ) Optimization**:
  - Implements the EOQ formula $\sqrt{\frac{2DS}{H}}$ where:
    - $D$ = Annualized Demand
    - $S$ = Fixed Ordering Fee (₹50)
    - $H$ = Annual Holding Cost ($\max(0.20 \times \text{Purchase Cost}, 1)$)
  - Computes recommended reorder intervals (days between orders) and projected annual cost savings.

- **Safety Stock & Reorder Point (ROP)**:
  - Safety Buffer: 20% of predicted monthly demand.
  - Reorder Point: $(\text{Monthly Demand} / 30 \times \text{Lead Time}) + \text{Safety Stock}$.
  - Automated status classification: `🚨 RESTOCK`, `📦 OVERSTOCK`, or `🟢 OPTIMAL`.

---

### 📊 Interactive Dashboard

- **Real-Time KPI Cards**:
  - **Procurement Restocks**: Formulations breaching Reorder Points needing replenishment.
  - **Overstock Holdings**: Formulations holding excess inventory (> 2.5× demand).
  - **Short-Dated Expirations**: Formulations carrying near-expiry or expired inventory, with a live breakdown of expired vs. near-expiry formulations.
  - **Active Database Items**: Total unique catalog count.

- **Visual Analytics**:
  - **Stock Health Distribution**: Donut breakdown of Optimal vs. Restock vs. Overstock holdings.
  - **Multi-Product Comparative Analysis**: Bar charts comparing Usable Stock, ROP, and Predicted Demand across formulations.

- **Tabbed Workspaces**:
  - **Procurement**: Formulations requiring restock, recommended purchase units, EOQ, and order intervals.
  - **Overstock**: Formulations with excess holdings.
  - **Expiry Risk**: Products with near-expiry lots (0–120 days) or already expired stock, complete with `(EXPIRED)` tags.
  - **Profitability**: Purchase cost, selling price, projected revenue, net profit, and margin percentages.
  - **EOQ Model**: Detailed optimal batch sizing, holding costs, and annual savings.
  - **Master Ledger**: Full unified catalog overview with inline CSV export.

---

### 🔄 Data Ingestion & Validation

- **Smart Column Aliasing**: Automatically accepts CSVs with varied naming conventions:
  - **Product Name**: `Product Name`, `Product`, `Item`, `Drug`, `Medicine`, `SKU`, `Name`, `Brand`
  - **Quantity**: `Quantity`, `Qty`, `Units`, `Sales`, `Volume`, `Count`, `Amount`
  - **Month**: `Month`, `Mo`, full names (`September`), 3-letter abbreviations (`Sep`), or numeric months (`1`–`12`)
  - **Year**: `Year`, `Yr`, 4-digit years
- **Robust In-Memory Parsing**:
  - Instant client-side parsing via PapaParse without Web Worker serialization failures.
  - Automatic UTF-8 BOM (`\uFEFF`) and whitespace stripping.
  - Positional array-to-object row recovery.
- **Interactive Preview & Inline Editing**:
  - Preview loaded data before running simulation.
  - Click any cell in the preview table to edit values inline.
- **Seeded Demo Database**: Preloaded with 8 clinical formulations (Amoxicillin, Lipitor, Metformin, Metoprolol, Gabapentin, Synthroid, Ventolin, Losartan) covering Sep–Dec 2020.

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation & Local Run

```bash
# Clone the repository
git clone https://github.com/SanskarEdhate/Pharma-Demand-Simulation-Procurement-System.git
cd Pharma-Demand-Simulation-Procurement-System

# Install dependencies
npm install

# Start development server
npm start
# (or npm run dev)
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

```bash
npm run build
```

---

## CSV Format Specification

You can upload any CSV file formatted like the example below:

```csv
Product Name,Quantity,Month,Year
Amoxicillin 500mg,1200,September,2020
Amoxicillin 500mg,1350,October,2020
Amoxicillin 500mg,1400,November,2020
Amoxicillin 500mg,1550,December,2020
Lipitor 20mg,800,September,2020
Lipitor 20mg,750,October,2020
Lipitor 20mg,900,November,2020
Lipitor 20mg,850,December,2020
```

*(Common header variations like `Product`, `Qty`, `Sep`, `2020` are also automatically recognized).*

---

## Technology Stack

- **Framework**: React 19 + Vite 8
- **Styling**: Tailwind CSS v4 + Custom Dark Theme Tokens
- **Icons**: Lucide React
- **Charts**: Recharts
- **CSV Engine**: PapaParse

---

## License

© 2026 Ageis Flow. All rights reserved.
