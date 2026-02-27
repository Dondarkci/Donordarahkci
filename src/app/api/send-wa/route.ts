
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { nama, nohp, lokasi, tanggal } = await req.json();

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Authorization": process.env.FONNTE_TOKEN || "",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        target: nohp,
        message: `Halo ${nama}, pendaftaran donor darah Anda di ${lokasi} pada tanggal ${tanggal} berhasil ✅. Satu tetes darah Anda sangat berarti bagi sesama. Terima kasih! - KAI Commuter`
      })
    });

    const result = await response.json();

    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error("WA API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
