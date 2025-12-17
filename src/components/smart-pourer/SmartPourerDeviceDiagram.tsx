import React from 'react';
import { Cpu, Radio, Droplets, Lightbulb, Battery, Wifi } from 'lucide-react';
import smartPourerImage from '@/assets/smart-pourer-device.png';

const SmartPourerDeviceDiagram = () => {
  const components = [
    {
      icon: Droplets,
      name: 'Pour Spout',
      desc: 'Food-grade stainless steel tube for precise liquid flow',
      color: 'text-amber-500',
    },
    {
      icon: Radio,
      name: 'Flow Sensor',
      desc: 'Micro turbine measuring pour volume in 0.1ml accuracy',
      color: 'text-amber-500',
    },
    {
      icon: Cpu,
      name: 'BLE 5.0 Chip',
      desc: 'Nordic nRF52840 for wireless data transmission',
      color: 'text-blue-500',
    },
    {
      icon: Lightbulb,
      name: 'LED Status',
      desc: 'RGB indicator for connection, pour, and alerts',
      color: 'text-green-500',
    },
    {
      icon: Battery,
      name: 'Battery',
      desc: 'CR2032 coin cell, 6-month lifespan',
      color: 'text-purple-500',
    },
    {
      icon: Wifi,
      name: 'Antenna',
      desc: 'Internal PCB antenna, 30m range',
      color: 'text-cyan-500',
    },
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Device Display - SVG + PNG side by side */}
      <div className="flex items-center gap-3">
        {/* SVG Schematic */}
        <div className="flex flex-col items-center">
          <span className="text-[7px] text-white/40 mb-1">Schematic</span>
          <svg 
            viewBox="0 0 60 140" 
            className="w-10 h-24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="26" y="0" width="8" height="35" rx="1" fill="#1a1a1a" stroke="#333" strokeWidth="0.5"/>
            <ellipse cx="30" cy="38" rx="6" ry="2.5" fill="#f59e0b"/>
            <path 
              d="M18 42 C12 46, 8 55, 8 65 C8 82, 12 98, 18 110 L42 110 C48 98, 52 82, 52 65 C52 55, 48 46, 42 42 Z" 
              fill="#0a0a0a" stroke="#333" strokeWidth="0.5"
            />
            <rect x="22" y="58" width="16" height="8" rx="1" fill="#f59e0b"/>
            <text x="30" y="64" textAnchor="middle" fill="#000" fontSize="4" fontWeight="bold">BLE</text>
            <circle cx="30" cy="78" r="3" fill="#22c55e" className="animate-pulse"/>
            <ellipse cx="30" cy="112" rx="14" ry="4" fill="#222" opacity="0.6"/>
          </svg>
        </div>

        {/* PNG Render */}
        <div className="flex flex-col items-center">
          <span className="text-[7px] text-white/40 mb-1">Device</span>
          <img 
            src={smartPourerImage} 
            alt="Smart Pourer Device" 
            className="w-14 h-24 object-contain rounded-lg"
          />
        </div>
      </div>
      
      {/* Component Labels - compact */}
      <div className="grid grid-cols-2 gap-1 text-[8px] w-full max-w-[160px]">
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/40 border border-white/10">
          <div className="w-1 h-1 rounded-full bg-amber-500" />
          <span className="text-white/60">Pour Spout</span>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/40 border border-white/10">
          <div className="w-1 h-1 rounded-full bg-amber-500" />
          <span className="text-white/60">Flow Sensor</span>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/40 border border-white/10">
          <div className="w-1 h-1 rounded-full bg-blue-500" />
          <span className="text-white/60">BLE Chip</span>
        </div>
        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/40 border border-white/10">
          <div className="w-1 h-1 rounded-full bg-green-500" />
          <span className="text-white/60">LED Status</span>
        </div>
      </div>

      {/* Detailed Component Breakdown */}
      <div className="w-full space-y-1">
        <h4 className="text-[9px] font-semibold text-white/80 uppercase tracking-wide">Component Specs</h4>
        <div className="grid gap-1">
          {components.map((comp) => (
            <div key={comp.name} className="flex items-start gap-1.5 p-1 rounded bg-black/30 border border-white/5">
              <comp.icon className={`w-2.5 h-2.5 ${comp.color} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <div className="text-[8px] font-medium text-white">{comp.name}</div>
                <div className="text-[7px] text-white/50 leading-tight">{comp.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SmartPourerDeviceDiagram;