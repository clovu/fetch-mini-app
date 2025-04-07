'use client'
import * as React from "react"
import { subDays } from "date-fns"
import { toast } from "sonner"
import { DateRange } from "react-day-picker";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";
import { Toaster } from "@/components/ui/sonner";

export default function Home() {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 1),
    to: new Date(),
  })
  const [loading, setLoading] = React.useState(false);

  async function exportExcel() {
    // 下载 excel
    const from = (date?.from?.getTime() ?? 0) / 1e3
    const to = (date?.to?.getTime() ?? from) / 1e3

    const params = new URLSearchParams({
      startDate: String(from),
      endDate: String(to),
    });

    try {
      setLoading(true);

      const response = await fetch(`/api/export?${params}`);

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err)
      toast.error('Report generation failed, CALL ME CALL ME', {
        description: err instanceof Error ? err.message : undefined,
        position: 'top-center'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <Toaster />
      <div className="flex gap-2">
        <DatePickerWithRange date={date} onChangeDate={setDate} />
        <Button onClick={exportExcel} disabled={loading}>
          Export
          {loading && <Loader2Icon className="animate-spin" />}
        </Button>
      </div>
    </div>
  );
}
