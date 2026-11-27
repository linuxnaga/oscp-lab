"use client";

import { useRef, useState } from "react";
import { Download, RotateCcw, Upload } from "lucide-react";
import { useOscpStore } from "@/context/OscpContext";
import { cn } from "@/lib/util";

export function BackupControls({ compact = false }: { compact?: boolean }) {
  const { exportJson, importJson, reset } = useOscpStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text });
    window.setTimeout(() => setMsg(null), 3500);
  };

  const onExport = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oscp-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    flash(true, "Progress exported");
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const res = importJson(await file.text());
    flash(res.ok, res.ok ? "Progress restored" : res.error);
  };

  const onReset = () => {
    if (window.confirm("Wipe all XP, labs, notes and flashcard history? Export a backup first if unsure.")) {
      reset();
      flash(true, "Progress reset");
    }
  };

  const btn = "flex items-center justify-center gap-1.5 rounded-md border border-edge bg-surface px-2.5 py-1.5 font-mono text-[11px] text-gray-300 transition-colors hover:border-gray-600 hover:text-white";

  return (
    <div>
      <div className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3")}>
        <button type="button" onClick={onExport} className={btn} title="Export JSON progress">
          <Download className="h-3.5 w-3.5" />
          {compact ? "Export" : "Export JSON"}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className={btn} title="Import JSON progress">
          <Upload className="h-3.5 w-3.5" />
          {compact ? "Import" : "Import JSON"}
        </button>
        <button type="button" onClick={onReset} className={cn(btn, "hover:border-crit/60 hover:text-crit")} title="Reset progress">
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
      {msg && (
        <div className={cn("mt-2 font-mono text-[11px]", msg.ok ? "text-pwn" : "text-crit")} role="status">
          {msg.text}
        </div>
      )}
    </div>
  );
}
