import React from "react";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex print:min-h-0 print:block print:bg-white">
      <Sidebar />
      <main className="flex-1 min-w-0 ml-64 p-8 h-screen flex flex-col print:ml-0 print:p-0 print:h-auto print:block">
        <div className="max-w-7xl mx-auto w-full h-full print:max-w-none print:w-full print:h-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
