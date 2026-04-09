
"use client";

import { useState } from "react";
import { useUser, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Terminal, Cpu, Database, Cloud, UserPlus, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";

export default function DeveloperSettingsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  
  // Authorization check
  const adminRoleRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "roles_admin", user.uid);
  }, [db, user]);
  const { data: adminRoleData, isLoading: isAdminCheckLoading } = useDoc(adminRoleRef);

  const isSuperAdmin = user?.email === "ronymunich@gmail.com";
  const hasAdminRole = !!adminRoleData;
  const isAuthorized = isSuperAdmin || hasAdminRole;

  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  if (isUserLoading || (user && isAdminCheckLoading)) return <div className="p-12 text-center font-body">Memeriksa hak akses...</div>;
  
  // Jika belum login atau bukan admin, arahkan ke login admin
  if (!user || !isAuthorized) {
    redirect("/admin");
    return null;
  }

  const handlePromoteSelf = async () => {
    if (!user) return;
    setIsPromoting(true);
    try {
      const adminRef = doc(db, "roles_admin", user.uid);
      await setDoc(adminRef, {
        email: user.email,
        uid: user.uid,
        createdAt: serverTimestamp(),
        type: "Self-Promoted"
      });
      toast({ title: "Berhasil", description: "Akun Anda kini telah terdaftar sebagai Admin di database." });
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } finally {
      setIsPromoting(false);
    }
  };

  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail || !newAdminPassword) {
      toast({ title: "Gagal", description: "Email dan Password wajib diisi.", variant: "destructive" });
      return;
    }

    setIsRegistering(true);
    
    const tempAppId = `TempApp-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppId);
    const tempAuth = getAuth(tempApp);

    try {
      // 1. Daftarkan di Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(tempAuth, newAdminEmail, newAdminPassword);
      const newUserUid = userCredential.user.uid;

      // 2. Tambahkan ke Firestore menggunakan UID baru
      const adminRef = doc(db, "roles_admin", newUserUid);
      await setDoc(adminRef, {
        email: newAdminEmail,
        uid: newUserUid,
        createdAt: serverTimestamp(),
        registeredBy: user.email
      });

      toast({ 
        title: "Pendaftaran Berhasil", 
        description: `Admin ${newAdminEmail} telah terdaftar di sistem Auth dan Database.` 
      });
      
      setNewAdminEmail("");
      setNewAdminPassword("");
    } catch (error: any) {
      let msg = error.message;
      if (error.code === 'auth/email-already-in-use') {
        msg = "Email sudah terdaftar di sistem login. Jika ia belum bisa masuk admin, hubungi developer untuk sinkronisasi UID manual.";
      }
      toast({ title: "Gagal Mendaftar", description: msg, variant: "destructive" });
    } finally {
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
          <p className="text-[#80766E]">Konfigurasi teknis dan manajemen hak akses sistem.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white md:col-span-2">
            <CardHeader className="bg-emerald-50 border-b border-emerald-100">
              <CardTitle className="text-xl flex items-center gap-3 text-emerald-700">
                <UserPlus className="h-5 w-5" /> Registrasi Admin Baru
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-amber-900 flex items-center gap-2">
                    <UserCheck className="h-5 w-5" /> Perbaiki Akses Saya
                  </h4>
                  <p className="text-sm text-amber-800">Klik tombol ini jika akun yang sedang Anda gunakan ({user.email}) tidak bisa mengakses fitur admin tertentu.</p>
                </div>
                <Button 
                  onClick={handlePromoteSelf} 
                  disabled={isPromoting || hasAdminRole}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold px-6"
                >
                  {hasAdminRole ? "Sudah Terdaftar di DB" : isPromoting ? "Memproses..." : "Jadikan Saya Admin"}
                </Button>
              </div>

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
                  {isRegistering ? "Mendaftarkan..." : "Daftarkan Akun"}
                </Button>
              </form>

              <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <div className="space-y-1">
                  <p className="font-bold">Informasi Sinkronisasi:</p>
                  <p>
                    Sistem akan mendaftarkan akun ke Firebase Authentication dan secara otomatis membuat dokumen di Firestore menggunakan <strong>UID</strong> (User ID) unik akun tersebut. Ini sangat penting agar Security Rules dapat memverifikasi akses dengan benar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-xl flex items-center gap-3 text-primary">
                <Terminal className="h-5 w-5" /> Detail Akun Anda
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#80766E] uppercase">UID (ID Unik)</span>
                <p className="font-mono text-xs bg-[#F5F3EF] p-2 rounded break-all">{user.uid}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#80766E] uppercase">Status Database</span>
                <p className={`text-sm font-bold ${hasAdminRole ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {hasAdminRole ? 'Terdaftar sebagai Admin' : 'Belum Terdaftar di roles_admin'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-blue-50 border-b border-blue-100">
              <CardTitle className="text-xl flex items-center gap-3 text-blue-700">
                <Database className="h-5 w-5" /> Integritas Data
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-[#80766E]">Pastikan koleksi <code className="bg-blue-50 px-1 rounded">roles_admin</code> di Firestore menggunakan <strong>Document ID</strong> yang sama dengan UID pengguna agar akses tidak ditolak oleh sistem keamanan.</p>
              <div className="flex justify-between items-center py-2 border-t border-[#F5F3EF]">
                <span className="text-[#80766E] text-sm">Provider</span>
                <span className="text-sm font-bold">{user.providerData[0]?.providerId || 'Email/Password'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
