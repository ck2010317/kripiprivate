"use client"

import { useState } from "react"
import { Monitor, Smartphone } from "lucide-react"

const devices = {
  "iPhone 15": { width: 393, height: 852, radius: 55, notch: "dynamic-island", scale: "iPhone 15" },
  "iPhone 16": { width: 393, height: 852, radius: 55, notch: "dynamic-island", scale: "iPhone 16" },
  "iPhone 16 Pro": { width: 402, height: 874, radius: 55, notch: "dynamic-island", scale: "iPhone 16 Pro" },
  "iPhone 16 Pro Max": { width: 440, height: 956, radius: 55, notch: "dynamic-island", scale: "iPhone 16 Pro Max" },
  "iPhone 15 Pro": { width: 393, height: 852, radius: 55, notch: "dynamic-island", scale: "iPhone 15 Pro" },
} as const

type DeviceName = keyof typeof devices

export default function MobilePreview() {
  const [selectedDevice, setSelectedDevice] = useState<DeviceName>("iPhone 16")
  const device = devices[selectedDevice]

  // Scale to fit viewport
  const frameHeight = device.height + 24 // padding
  const maxHeight = typeof window !== "undefined" ? window.innerHeight - 180 : 700
  const scale = Math.min(1, maxHeight / frameHeight, 0.85)

  return (
    <div className="min-h-screen bg-[#07060e] flex flex-col items-center py-6 px-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <Smartphone className="w-6 h-6 text-purple-400" />
          PrivatePay Mobile Preview
        </h1>
        <p className="text-purple-300/50 text-sm mt-1">Select a device to preview</p>
      </div>

      {/* Device Selector */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        {(Object.keys(devices) as DeviceName[]).map((name) => (
          <button
            key={name}
            onClick={() => setSelectedDevice(name)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedDevice === name
                ? "bg-purple-500/20 border border-purple-400/40 text-purple-200 shadow-lg shadow-purple-500/10"
                : "bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white/70"
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Device Info */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-400/20">
          <Monitor className="w-3.5 h-3.5 text-purple-400/70" />
          <span className="text-xs text-purple-300/70 font-mono">{device.width} × {device.height}</span>
        </div>
        <span className="text-xs text-purple-300/40">{selectedDevice}</span>
      </div>

      {/* Device Frame */}
      <div
        className="relative flex-shrink-0"
        style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
      >
        {/* Outer frame - titanium border */}
        <div
          className="relative rounded-[55px] p-[12px]"
          style={{
            width: device.width + 24,
            height: device.height + 24,
            background: "linear-gradient(145deg, #3a3a3c, #1c1c1e, #2c2c2e)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 25px 60px rgba(0,0,0,0.6), 0 0 80px rgba(139,92,246,0.08), inset 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          {/* Side buttons */}
          {/* Power button - right */}
          <div className="absolute right-[-3px] top-[180px] w-[3px] h-[80px] rounded-r-sm bg-gradient-to-b from-[#3a3a3c] via-[#2a2a2c] to-[#3a3a3c]" />
          {/* Volume up - left */}
          <div className="absolute left-[-3px] top-[160px] w-[3px] h-[40px] rounded-l-sm bg-gradient-to-b from-[#3a3a3c] via-[#2a2a2c] to-[#3a3a3c]" />
          {/* Volume down - left */}
          <div className="absolute left-[-3px] top-[210px] w-[3px] h-[40px] rounded-l-sm bg-gradient-to-b from-[#3a3a3c] via-[#2a2a2c] to-[#3a3a3c]" />
          {/* Silent switch - left */}
          <div className="absolute left-[-3px] top-[120px] w-[3px] h-[24px] rounded-l-sm bg-gradient-to-b from-[#3a3a3c] via-[#2a2a2c] to-[#3a3a3c]" />

          {/* Screen area */}
          <div
            className="relative overflow-hidden bg-black"
            style={{
              width: device.width,
              height: device.height,
              borderRadius: device.radius - 8,
            }}
          >
            {/* Dynamic Island */}
            <div className="absolute top-[11px] left-1/2 -translate-x-1/2 z-50">
              <div
                className="bg-black rounded-full"
                style={{ width: 126, height: 37 }}
              />
            </div>

            {/* Status bar overlay */}
            <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-8 pt-[15px]">
              <span className="text-white text-[13px] font-semibold">
                {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </span>
              <div className="flex items-center gap-1.5">
                {/* Signal bars */}
                <div className="flex items-end gap-[1.5px]">
                  {[3, 5, 7, 9].map((h, i) => (
                    <div key={i} className="w-[3px] rounded-sm bg-white" style={{ height: h }} />
                  ))}
                </div>
                {/* WiFi */}
                <svg width="14" height="10" viewBox="0 0 14 10" className="text-white ml-0.5">
                  <path d="M7 9.5a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" />
                  <path d="M4.5 7a3.5 3.5 0 015 0" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                  <path d="M2.5 5a6 6 0 019 0" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                  <path d="M0.5 3a9 9 0 0113 0" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                </svg>
                {/* Battery */}
                <div className="flex items-center ml-0.5">
                  <div className="w-[22px] h-[10px] rounded-[3px] border border-white/50 p-[1.5px]">
                    <div className="h-full w-[75%] bg-white rounded-[1.5px]" />
                  </div>
                  <div className="w-[1.5px] h-[4px] bg-white/50 rounded-r-sm ml-[0.5px]" />
                </div>
              </div>
            </div>

            {/* Home indicator */}
            <div className="absolute bottom-[8px] left-1/2 -translate-x-1/2 z-50">
              <div className="w-[134px] h-[5px] bg-white/30 rounded-full" />
            </div>

            {/* App content via iframe */}
            <iframe
              src="/mobile"
              className="w-full h-full border-none"
              style={{
                width: device.width,
                height: device.height,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
