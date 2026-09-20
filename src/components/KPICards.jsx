import React from "react";
import { AlertOctagon, TrendingUp, CalendarDays, ClipboardList } from "lucide-react";

export default function KPICards({ data }) {
  // Counts
  const totalItems = data.length;
  const restockItems = data.filter((item) => item.Action.includes("RESTOCK")).length;
  const excessiveItems = data.filter((item) => item.Action.includes("EXCESSIVE")).length;
  const expiredItems = data.filter((item) => (item["Expired Stock"] || 0) > 0).length;
  const riskyItems = data.filter((item) => (item["Risky Stock (Near Expiry)"] || 0) > 0).length;
  const expiryHazardItems = data.filter(
    (item) => (item["Risky Stock (Near Expiry)"] || 0) > 0 || (item["Expired Stock"] || 0) > 0
  ).length;

  const cards = [
    {
      title: "Procurement Restocks",
      value: restockItems,
      total: totalItems,
      label: "Replenishment Orders",
      desc: `${Math.round((restockItems / (totalItems || 1)) * 100)}% of formulations require orders`,
      icon: AlertOctagon,
      textColor: "text-rose-400",
      indicatorColor: "bg-rose-500",
      barColor: "bg-rose-500/30",
    },
    {
      title: "Overstock Holdings",
      value: excessiveItems,
      total: totalItems,
      label: "Excessive Stocking",
      desc: `${Math.round((excessiveItems / (totalItems || 1)) * 100)}% of items are over-buffered`,
      icon: TrendingUp,
      textColor: "text-amber-400",
      indicatorColor: "bg-amber-500",
      barColor: "bg-amber-500/30",
    },
    {
      title: "Short-Dated Expirations",
      value: expiryHazardItems,
      total: totalItems,
      label: "Expiry Risk (≤120d / Expired)",
      desc: `${expiredItems} expired · ${riskyItems} near-expiry`,
      icon: CalendarDays,
      textColor: "text-orange-400",
      indicatorColor: "bg-orange-500",
      barColor: "bg-orange-500/30",
    },
    {
      title: "Active Database Items",
      value: totalItems,
      total: totalItems,
      label: "Monitored Catalog",
      desc: "Unique items processed in current simulation runs",
      icon: ClipboardList,
      textColor: "text-accent",
      indicatorColor: "bg-accent",
      barColor: "bg-accent/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        const percent = totalItems > 0 ? (card.value / totalItems) * 100 : 0;
        
        const accentClass = idx === 0 ? 'kpi-accent-procurement' : 
                            idx === 1 ? 'kpi-accent-overstock' : 
                            idx === 2 ? 'kpi-accent-expiry' : 'kpi-accent-active';
        
        return (
          <div
            key={idx}
            className={`bg-paper-2 border border-rule hover:border-rule-hover p-5 rounded-md flex flex-col justify-between card-hover ${accentClass}`}
          >
            {/* Top Row: Metric & Title */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex-grow">
                <span className="text-xs font-body text-ink-2 uppercase block mb-1">
                  {card.title}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-display font-semibold text-ink tnum tracking-tight">
                    {card.value}
                  </span>
                  {totalItems > 0 && idx < 3 && (
                    <span className="text-sm font-display font-medium text-ink-2 tnum">
                      / {totalItems}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-2 bg-paper-3 border border-rule rounded-md text-ink-2">
                <Icon className="w-4 h-4" />
              </div>
            </div>
            
            {/* Bottom Row: Progress & Context Description */}
            <div className="mt-auto">
              <div className="w-full bg-paper-3 rounded-full h-1 mb-3 relative overflow-hidden">
                <div
                  className={`h-full rounded-full ${card.indicatorColor}`}
                  style={{ width: `${percent}%` }}
                ></div>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-body font-medium text-ink flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${card.indicatorColor}`}></span>
                  {card.label}
                </span>
                <span className="text-xs text-ink-2 leading-relaxed font-body">
                  {card.desc}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
