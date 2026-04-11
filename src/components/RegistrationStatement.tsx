
"use client";

import React from "react";
import { ParticipantRegistration } from "@/lib/types";
import { format, parseISO } from "date-fns";
import Image from "next/image";

interface RegistrationStatementProps {
  registration: ParticipantRegistration;
  index: number;
}

export default function RegistrationStatement({ registration, index }: RegistrationStatementProps) {
  // Parse event date for the reference number (mm/yy)
  let mm = "00";
  let yy = "00";
  try {
    if (registration.locationDate) {
      const eventDate = parseISO(registration.locationDate);
      mm = format(eventDate, "MM");
      yy = format(eventDate, "yy");
    }
  } catch (e) {
    console.error("Error parsing event date for statement", e);
  }

  // Format registration date for the signature section
  // Firestore timestamps have seconds, we fallback to now if missing
  const regDate = registration.registrationDate?.seconds 
    ? new Date(registration.registrationDate.seconds * 1000) 
    : new Date();
  
  const regDateFormatted = format(regDate, "dd/MM/yyyy");

  return (
    <div className="bg-white p-8 md:p-12 text-[#2D241E] font-serif leading-relaxed max-w-[800px] mx-auto shadow-sm print:shadow-none print:p-0">
      {/* Header with Logo */}
      <div className="flex justify-end mb-8">
        <div className="relative w-32 h-12">
          <Image 
            src="https://picsum.photos/seed/kci-logo/200/100" 
            alt="KAI Commuter Logo" 
            fill 
            className="object-contain"
            data-ai-hint="train logo"
          />
        </div>
      </div>

      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-lg font-bold underline uppercase tracking-wide">Formulir Pernyataan</h1>
        <p className="text-sm">No. {index}/dondarkci/{mm}/{yy}</p>
      </div>

      {/* Identification Section */}
      <div className="space-y-2 mb-8">
        <p>Saya yang bertanda tangan dibawah ini :</p>
        <div className="grid grid-cols-[140px_10px_1fr] gap-2 ml-4">
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
      <div className="space-y-4 mb-12 text-justify">
        <p>Menyatakan bahwa :</p>
        <ol className="list-decimal ml-8 space-y-3">
          <li>
            Saya menyatakan telah membaca dan memahami Kebijakan Privasi Donor Darah PT Kereta Commuter Indonesia, dan dengan ini memberikan persetujuan kepada PT Kereta Commuter Indonesia untuk mengumpulkan, menggunakan dan menyimpan data pribadi saya untuk keperluan pendaftaran dan pelaksanaan donor darah.
          </li>
          <li>
            Saya memberikan persetujuan secara sadar dan ekspilist kepada PT Kereta Commuter Indonesia untuk memproses Data Pribadi Spesifik guna keperluan donor darah, sesuai ketentuan perundang-undangan.
          </li>
          <li>
            Saya menyetujui bahwa Data Pribadi saya dapat dibagikan kepada pihak yang berwenang hanya untuk keperluan pelaksanaan donor darah.
          </li>
        </ol>
      </div>

      {/* Footer / Signature Section */}
      <div className="flex flex-col items-center ml-auto w-[250px] mr-4 space-y-1">
        <p className="text-sm mb-2">Jakarta, {regDateFormatted}</p>
        <div className="py-2 flex items-center justify-center min-h-[140px]">
          {/* Functional Digital Signature QR Code - Using fixed dimensions to prevent cropping in PDF */}
          <Image 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(registration.fullName)}`} 
            alt="Digital Signature QR" 
            width={120}
            height={120}
            className="block"
            priority
          />
        </div>
        <div className="w-full border-t border-gray-400 pt-2 text-center">
          <p className="font-bold capitalize text-lg">
            {registration.fullName}
          </p>
        </div>
      </div>
      
      {/* Print Button Instruction (Hidden in Print) */}
      <div className="mt-16 text-center print:hidden">
        <p className="text-xs text-gray-400 italic">Dokumen ini sah secara digital melalui sistem Donor Darah PT KCI</p>
      </div>
    </div>
  );
}
