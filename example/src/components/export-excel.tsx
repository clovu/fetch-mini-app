import { subDays } from "date-fns"
import { toast } from "sonner"
import * as React from "react"
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "./ui/date-picker-with-range";
import { Button } from "./ui/button";
import { Loader2Icon } from "lucide-react";

export function ExportExcel({
  url: serverURL,
  children,
  filename
}: Readonly<{
  url: string // export data API url
  filename: string
} & React.PropsWithChildren>) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: subDays(new Date(), 1),
    to: new Date(),
  })
  const [loading, setLoading] = React.useState(false);

  async function download() {
    // 下载 excel
    const from = (date?.from?.getTime() ?? 0) / 1e3
    const to = (date?.to?.getTime() ?? from) / 1e3

    const params = new URLSearchParams({
      t: new Date().getTime().toString()
    });

    if (from > 0) {
      params.append('startDate', from.toFixed())
      params.append('endDate', to.toFixed())
    }

    try {
      setLoading(true);

      const response = await fetch(`${serverURL}?${params}`);

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename
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

  return <>
    <DatePickerWithRange date={date} onChangeDate={setDate} />
    <Button onClick={download} disabled={loading}>
      {children}
      {loading && <Loader2Icon className="animate-spin" />}
    </Button>
  </>
}
