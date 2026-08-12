import { useState } from "react";
import { useLocation } from "wouter";
import WorkersList from "@/components/dashboard/WorkersList";

export default function WorkersHome() {
  const [, setLocation] = useLocation();

  const handleSelectWorker = (workerId: number) => {
    setLocation(`/dashboard/${workerId}`);
  };

  return (
    <div className="min-h-screen bg-[#050810]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#050810]/80 backdrop-blur-xl border-b border-white/5">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img 
              src="/qiko-logo.png" 
              alt="Qiko" 
              className="h-8 w-auto"
              style={{ filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.5))' }}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        <WorkersList onSelectWorker={handleSelectWorker} />
      </main>

      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div 
          className="absolute w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #6366F1 0%, transparent 70%)',
            top: '-10%',
            left: '20%',
            filter: 'blur(80px)',
            animation: 'float1 12s ease-in-out infinite',
          }}
        />
        <div 
          className="absolute w-[500px] h-[500px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)',
            top: '40%',
            right: '5%',
            filter: 'blur(80px)',
            animation: 'float2 10s ease-in-out infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -30px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 20px) scale(1.1); }
          66% { transform: translate(30px, -40px) scale(0.9); }
        }
      `}</style>
    </div>
  );
}
