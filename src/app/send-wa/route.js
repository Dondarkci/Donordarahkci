// app/api/send-wa/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  const { nama, nomor_wa } = await request.json();

  try {
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': process.env.FONNTE_TOKEN, // Mengambil token dari Env
      },
      body: new URLSearchParams({
        target: nomor_wa,
        message: `Halo ${nama}, terima kasih telah mendaftar sebagai donor darah. Kontribusi Anda sangat berarti!`,
        countryCode: '62', // Kode negara Indonesia
      }),
    });

    const result = await response.json();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}