"use client"

import { useEffect, useMemo, useState } from "react"
import { Upload, Scan } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Sample } from "@/components/types"
import SampleCard from "@/components/SampleCard"
import BarcodeScanner from "@/components/BarcodeScanner"

export default function DashboardPage() {
  const [samples, setSamples] = useState<Sample[]>([])
  const [loaded, setLoaded] = useState(false)
  const [q, setQ] = useState("")
  const [minAuth, setMinAuth] = useState<number | "">("")
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const router = useRouter()

  const fetchData = async () => {
    const res = await fetch("/sampleData.json", { cache: "no-store" })
    const data: Sample[] = await res.json()
    setSamples(data)
    setLoaded(true)
  }

  const handleScanSuccess = (sampleNo: string) => {
    // Navigate directly to the sample details page
    router.push(`/dashboard/${encodeURIComponent(sampleNo)}`)
  }

  useEffect(() => {
    // initial state: show empty, let user click "Fetch Data"
  }, [])

  const filtered = useMemo(() => {
    return samples.filter((s) => {
      const matchText =
        s.sampleNo.toLowerCase().includes(q.toLowerCase()) ||
        s.herbName.toLowerCase().includes(q.toLowerCase()) ||
        s.originRegion.toLowerCase().includes(q.toLowerCase())
      const matchAuth = typeof minAuth === "number" ? s.authenticityScore >= minAuth : true
      return matchText && matchAuth
    })
  }, [samples, q, minAuth])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand">AyuSure Dashboard</h1>
          <p className="text-gray-600 mt-1">Fetch authenticated sample data or upload a new entry for evaluation.(Click tha samples to view detailed analysis)</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchData} className="btn btn-primary">
            Fetch Data
          </button>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="btn btn-secondary relative overflow-hidden group"
          >
            <Scan className="h-4 w-4 mr-2 group-hover:animate-pulse" />
            Scan Sample
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </button>
          <button className="btn btn-outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload Manually
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="grid md:grid-cols-4 gap-4">
          <input
            placeholder="Search by sample, herb, or region"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2"
          />
          <input
            type="number"
            min={0}
            max={100}
            placeholder="Min authenticity %"
            value={minAuth}
            onChange={(e) => setMinAuth(e.target.value === "" ? "" : Number(e.target.value))}
            className="w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </div>
      </div>

      {!loaded ? (
        <p className="text-gray-600">No data loaded yet. Select "Fetch Data" to view samples.</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-600">No samples match your filters.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((s) => (
            <SampleCard key={s.sampleNo} s={s} />
          ))}
        </div>
      )}

      {/* Floating Scan Button for Mobile */}
      <button
        onClick={() => setIsScannerOpen(true)}
        className="fixed bottom-6 right-6 z-40 md:hidden bg-blue-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 hover:bg-blue-700"
        aria-label="Scan Sample Barcode"
      >
        <Scan className="h-6 w-6" />
      </button>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  )
}
