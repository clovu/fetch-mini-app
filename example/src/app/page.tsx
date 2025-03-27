'use client'
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-picker-with-range";

const name = process?.release?.name

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      {name}
      <div className="flex gap-2">
        <DatePickerWithRange />
        <Button onClick={() => {}}>Export</Button>
      </div>
    </div>
  );
}
