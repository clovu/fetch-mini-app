'use client'
import * as React from "react"

import { Toaster } from "@/components/ui/sonner";
import { ExportExcel } from "@/components/export-excel";

export default function Home() {
  return <>
    <Toaster />
    <div className="container mx-auto p-4 grid items-center justify-center gap-2">
      <div className="flex gap-2">
        <ExportExcel url="/api/export" filename="analyze-data.xlsx">Export Total</ExportExcel>
      </div>

      <div className="flex gap-2">
        <ExportExcel url="/api/opening-rate" filename="opening-rate.xlsx">Export Opening-Rate</ExportExcel>
      </div>
    </div>
  </>
}
