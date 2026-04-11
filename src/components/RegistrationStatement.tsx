
"use client";

import React from "react";
import { ParticipantRegistration } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { PlaceHolderImages } from "@/lib/placeholder-images";

interface RegistrationStatementProps {
  registration: ParticipantRegistration;
  index: number;
}

function toRoman(num: number): string {
  const roman: { [key: number]: string } = {
    1: "I", 2: "II", 3: "III", 4: "IV", 5: "V", 6: "VI",
    7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII"
  };
  return roman[num] || "00";
}

export default function RegistrationStatement({ registration, index }: RegistrationStatementProps) {
  const kciLogo = PlaceHolderImages.find(img => img.id === "logo-kci")?.imageUrl || "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/KAI_Commuter_logo.svg/1024px-KAI_Commuter_logo.svg.png";

  // Parse event date for the reference number (Roman Month / Full Year)
  let mmRoman = "00";
  let yyyy = "0000";
  try {
    if (registration.locationDate) {
      const eventDate = parseISO(registration.locationDate);
      const monthNum = parseInt(format(eventDate, "M"));
      mmRoman = toRoman(monthNum);
      yyyy = format(eventDate, "yyyy");
    }
  } catch (e) {
    console.error("Error parsing event date for statement", e);
  }

  // Format registration date for the signature section
  const regDate = registration.registrationDate?.seconds 
    ? new Date(registration.registrationDate.seconds * 1000) 
    : new Date();
  
  const regDateFormatted = format(regDate, "dd/MM/yyyy");

  return (
    <div className="bg-white p-10 text-[#2D241E] font-serif leading-relaxed w-[210mm] min-h-[296mm] mx-auto shadow-sm print:shadow-none print:p-0 flex flex-col box-border">
      {/* Header with Logo */}
      <div className="flex justify-end mb-4">
        <div className="w-48 h-16 relative">
          <img 
            src={kciLogo} 
            alt="KAI Commuter Logo" 
            className="w-full h-full object-contain object-right"
            crossOrigin="anonymous"
          />
        </div>
      </div>

      {/* Title Area */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold underline uppercase tracking-wide mb-1">Formulir Pernyataan</h1>
        <p className="text-base">No. {index}/dondarkci/{mmRoman}/{yyyy}</p>
      </div>

      {/* Identification Section */}
      <div className="space-y-1 mb-6">
        <p className="text-base">Saya yang bertanda tangan dibawah ini :</p>
        <div className="grid grid-cols-[160px_10px_1fr] gap-x-2 ml-4 text-base">
          <span className="font-medium">Nama</span>
          <span>:</span>
          <span className="capitalize">{registration.fullName}</span>
          
          <span className="font-medium">NIPP/NIK</span>
          <span>:</span>
          <span>{registration.nipp || registration.nik || "-"}</span>
          
          <span className="font-medium">Alamat Email</span>
          <span>:</span>
          <span>{registration.email}</span>
        </div>
      </div>

      {/* Declaration Section */}
      <div className="space-y-3 mb-8 text-justify text-base">
        <p>Menyatakan bahwa :</p>
        <div className="ml-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-4 shrink-0 font-medium">1.</span>
            <p className="flex-1 m-0">
              Saya menyatakan telah membaca dan memahami Kebijakan Privasi Donor Darah PT Kereta Commuter Indonesia, dan dengan ini memberikan persetujuan kepada PT Kereta Commuter Indonesia untuk mengumpulkan, menggunakan dan menyimpan data pribadi saya untuk keperluan pendaftaran dan pelaksanaan donor darah.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-4 shrink-0 font-medium">2.</span>
            <p className="flex-1 m-0">
              Saya memberikan persetujuan secara sadar dan ekspilist kepada PT Kereta Commuter Indonesia untuk memproses Data Pribadi Spesifik guna keperluan donor darah, sesuai ketentuan perundang-undangan.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-4 shrink-0 font-medium">3.</span>
            <p className="flex-1 m-0">
              Saya menyetujui bahwa Data Pribadi saya dapat dibagikan kepada pihak yang berwenang hanya untuk keperluan pelaksanaan donor darah.
            </p>
          </div>
        </div>
      </div>

      {/* Footer / Signature Section */}
      <div className="flex flex-col items-center ml-auto w-[280px] mr-4 text-center mt-2">
        <p className="text-base mb-1">Jakarta, {regDateFormatted}</p>
        <div className="mb-1 flex items-center justify-center">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(registration.fullName || "")}`} 
            alt="Digital Signature QR" 
            style={{ width: '120px', height: '120px', display: 'block' }}
            crossOrigin="anonymous"
          />
        </div>
        
        <div className="relative w-full">
          <p className="font-bold capitalize text-lg mb-1">
            {registration.fullName}
          </p>
          {/* Signature Line */}
          <div className="w-full border-t border-gray-400"></div>
        </div>
      </div>
      
      {/* Absolute Bottom Text */}
      <div className="mt-auto pb-8 text-center">
        <p className="text-sm text-[#A0A8B0] italic">
          Dokumen ini sah secara digital melalui sistem Donor Darah PT KCI
        </p>
      </div>
    </div>
  );
}
