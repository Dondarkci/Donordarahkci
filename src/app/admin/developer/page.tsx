
"use client";

import { useState } from "react";
import { useUser, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Terminal, Cpu, Database, Cloud, UserPlus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { collection, doc, setDoc, serverTimestamp, query, where } from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";

export default function DeveloperSettingsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  
  // Authorization check
  const adminCheckQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "roles_admin"), where("email", "==", user.email));
  }, [db, user]);
  const { data: adminRoleData, isLoading: isAdminCheckLoading } = useCollection(adminCheckQuery);

  const isSuperAdmin = user?.email === "ronymunich@gmail.com";
  const hasAdminRole = adminRoleData && adminRoleData.length > 0;
  const isAuthorized = isSuperAdmin || hasAdminRole;

  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  if (isUserLoading || (user && isAdminCheckLoading)) return <div className="p-12 text-center font-body">Memeriksa hak akses...</div>;
  
  if (!user || !isAuthorized) {
    redirect("/admin");
    return null;
  }

  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminPassword) {
      toast({ title: "Gagal", description: "Email dan Password wajib diisi.", variant: "destructive" });
      return;
    }

    if (newAdminPassword.length < 6) {
      toast({ title: "Gagal", description: "Password minimal 6 karakter.", variant: "destructive" });
      return;
    }

    setIsRegistering(true);
    
    // Gunakan app instance sementara agar tidak mengganggu sesi login admin utama
    const tempAppId = `TempApp-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppId);
    const tempAuth = getAuth(tempApp);

    try {
      // 1. Daftarkan di Firebase Authentication
      try {
        await createUserWithEmailAndPassword(tempAuth, newAdminEmail, newAdminPassword);
      } catch (authError: any) {
        // Jika email sudah ada di Auth, kita tetap lanjutkan untuk memberi akses Firestore
        if (authError.code !== 'auth/email-already-in-use') {
          throw authError;
        }
      }

      // 2. Tambahkan hak akses admin ke Firestore
      const adminRef = doc(collection(db, "roles_admin"));
      await setDoc(adminRef, {
        email: newAdminEmail,
        createdAt: serverTimestamp(),
        registeredBy: user.email
      });

      toast({ 
        title: "Pendaftaran Berhasil", 
        description: `Admin ${newAdminEmail} telah terdaftar otomatis di sistem Authentication dan Database.` 
      });
      
      setNewAdminEmail("");
      setNewAdminPassword("");
    } catch (error: any) {
      toast({ title: "Gagal Mendaftar", description: error.message, variant: "destructive" });
    } finally {
      // Hapus app instance sementara
      await deleteApp(tempApp);
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5F0] p-6 md:p-12 space-y-8 font-body">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/admin">
            <Button variant="ghost" className="text-[#8B4513] hover:bg-[#8B4513]/5 gap-2 font-bold">
              <ArrowLeft className="h-4 w-4" /> Kembali ke Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Mode Developer</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-headline font-bold text-[#2D241E]">Pengaturan Developer</h1>
          <p className="text-[#80766E]">Konfigurasi teknis dan sistem aplikasi donor darah.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white md:col-span-2">
            <CardHeader className="bg-emerald-50 border-b border-emerald-100">
              <CardTitle className="text-xl flex items-center gap-3 text-emerald-700">
                <UserPlus className="h-5 w-5" /> Registrasi Admin Otomatis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleRegisterAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-[#2D241E]">Email Admin Baru</Label>
                  <Input 
                    type="email" 
                    placeholder="admin.baru@email.com" 
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="h-12 bg-[#F8F7F4] border-none rounded-xl" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-[#2D241E]">Password Baru</Label>
                  <Input 
                    type="password" 
                    placeholder="Minimal 6 karakter" 
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="h-12 bg-[#F8F7F4] border-none rounded-xl" 
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isRegistering}
                  className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm"
                >
                  {isRegistering ? "Mendaftarkan..." : "Daftarkan Sekarang"}
                </Button>
              </form>
              <div className="mt-4 flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold">Info Sistem:</p>
                  <p>
                    Sistem akan mendaftarkan akun secara otomatis ke Firebase Authentication dan memberikan hak akses administrator ke database. Akun dapat langsung digunakan untuk login setelah didaftarkan.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-xl flex items-center gap-3 text-primary">
                <Terminal className="h-5 w-5" /> Status Sistem
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-[#F5F3EF]">
                <span className="text-[#80766E]">Versi Aplikasi</span>
                <span className="font-mono text-sm bg-[#F5F3EF] px-2 py-1 rounded">v1.2.0-stable</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#F5F3EF]">
                <span className="text-[#80766E]">Environment</span>
                <span className="font-bold text-emerald-600">Production</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[#80766E]">Engine</span>
                <span className="text-sm">Next.js 15.x / Firebase</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-blue-50 border-b border-blue-100">
              <CardTitle className="text-xl flex items-center gap-3 text-blue-700">
                <Cloud className="h-5 w-5" /> Integrasi API
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-[#F5F3EF]">
                <span className="text-[#80766E]">Email Service (Resend)</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">CONNECTED</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#F5F3EF]">
                <span className="text-[#80766E]">WhatsApp (Fonnte)</span>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded">PENDING CONFIG</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[#80766E]">Firestore DB</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">ONLINE</span>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-[#F8F7F4] border-b border-[#EAE7E2]">
              <CardTitle className="text-xl flex items-center gap-3 text-[#2D241E]">
                <Database className="h-5 w-5" /> Maintenance Tools
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Button variant="outline" className="h-16 rounded-2xl border-dashed border-2 hover:bg-primary/5 hover:border-primary hover:text-primary transition-all font-bold">
                  Clear Cache System
                </Button>
                <Button variant="outline" className="h-16 rounded-2xl border-dashed border-2 hover:bg-primary/5 hover:border-primary hover:text-primary transition-all font-bold">
                  Export System Logs
                </Button>
                <Button variant="outline" className="h-16 rounded-2xl border-dashed border-2 hover:bg-primary/5 hover:border-primary hover:text-primary transition-all font-bold">
                  Re-initialize Auth
                </Button>
              </div>
              <p className="mt-6 text-sm text-[#80766E] italic text-center">
                *Tindakan di atas bersifat teknis dan berpengaruh pada performa sistem secara keseluruhan.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
