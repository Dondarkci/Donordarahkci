import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, nama, lokasi, tanggal } = await request.json();

    const data = await resend.emails.send({
      from: 'Donor Darah <admin@dondarkci.com>', // Ganti dengan domain terverifikasi di dashboard Resend
      to: [email],
      subject: 'Konfirmasi Pendaftaran Donor Darah PT KCI',
      html: `
        <p>Halo ${nama},</p>
        <p>Terimakasih, anda telah terdaftar sebagai peserta Donor Darah PT Kereta Commuter Indonesa di ${lokasi} pada tanggal ${tanggal}. Setetes darah yang anda berikan sangat berarti bagi sesama.</p>
      `,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
