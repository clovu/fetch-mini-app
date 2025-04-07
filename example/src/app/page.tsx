'use client'
import * as React from "react"

import { Toaster } from "@/components/ui/sonner";
import { ExportExcel } from "@/components/export-excel";

export default function Home() {
  return <>
    <Toaster />
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="flex gap-2">
        <ExportExcel url="/api/export" filename="analyze-data.xlsx">Export Total</ExportExcel>
      </div>

      <div className="flex gap-2">
        <ExportExcel url="/api/opening-rate" filename="opening-rate.xlsx">Export Opening-Rate</ExportExcel>
      </div>
    </div>
  </>
}
