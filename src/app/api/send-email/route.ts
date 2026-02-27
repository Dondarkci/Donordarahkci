import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
  try {
    const { email, nama } = await request.json();

    const data = await resend.emails.send({
      from: 'Donor Darah <admin@dondarkci.com>', // Ganti dengan domain terverifikasi nanti
      to: [email],
      subject: 'Konfirmasi Pendaftaran Donor Darah',
      html: `<strong>Halo ${nama}!</strong><p>Terima kasih telah mendaftar sebagai donor darah. Kontribusi Anda sangat berarti.</p>`,
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}