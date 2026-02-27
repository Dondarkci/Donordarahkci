
"use client";

import { Droplet, TrainFront, ChevronRight } from "lucide-react";
import RegistrationForm from "@/components/RegistrationForm";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F6]">
      {/* Header Section */}
      <header className="bg-primary relative overflow-hidden py-16 md:py-24 text-white text-center shadow-lg">
        {/* Train Watermark */}
        <div className="absolute right-[-40px] top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
          <TrainFront className="h-72 w-72" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 flex flex-col items-center">
          {/* Droplet Icon in White Box */}
          <div className="bg-white rounded-[32px] p-8 mb-10 shadow-xl animate-in fade-in zoom-in duration-1000">
            <Droplet className="h-20 w-20 text-primary fill-current" />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold font-headline mb-6 tracking-tight leading-tight">
            Donor Darah PT. Kereta Commuter Indonesia
          </h1>
          <p className="text-lg md:text-2xl font-body opacity-90 max-w-2xl">
            Satu tetes darah yang Anda berikan sangat berarti bagi sesama.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 md:py-20 space-y-16">
        {/* Greeting Section */}
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-700">
          <h2 className="text-3xl md:text-4xl font-bold text-primary flex items-center gap-3 font-headline">
            Hallo Insan KAI Commuter <ChevronRight className="h-8 w-8 text-primary/30" />
          </h2>
          <p className="text-lg md:text-xl text-[#80766E] font-normal leading-relaxed max-w-4xl">
            Silahkan isi formulir berikut dengan data yang benar untuk mengikuti kegiatan donor darah. Pastikan anda memilih Lokasi dan Tanggal sesuai ketersediaan.
          </p>
        </div>

        {/* Form Component */}
        <RegistrationForm />
      </main>

      {/* Footer */}
      <footer className="py-20 text-center flex flex-col items-center space-y-5">
        <div className="flex items-center gap-4 text-[#80766E]/70">
          <TrainFront className="h-8 w-8" />
          <span className="text-2xl font-bold font-headline tracking-widest uppercase">KAI Commuter</span>
        </div>
        <p className="text-sm text-[#80766E]/50 font-body">
          &copy; 2026 PT. Kereta Commuter Indonesia. Seluruh hak cipta dilindungi.
        </p>
      </footer>
    </div>
  );
}
