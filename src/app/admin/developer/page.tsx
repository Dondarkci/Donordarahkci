
"use client";

import { useState } from "react";
import { useUser, useFirestore, useMemoFirebase, useDoc } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Terminal, Cpu, Database, Cloud, UserPlus, ShieldCheck, UserCheck, RefreshCw } from "lucide-react";
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
  const [manualUid, setManualUid] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
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

  const handleManualSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUid || !manualEmail) {
      toast({ title: "Gagal", description: "Email dan UID wajib diisi.", variant: "destructive" });
      return;
    }

    setIsSyncing(true);
    try {
      const adminRef = doc(db, "roles_admin", manualUid.trim());
      await setDoc(adminRef, {
        email: manualEmail.trim(),
        uid: manualUid.trim(),
        createdAt: serverTimestamp(),
        syncedBy: user.email,
        type: "Manual-Sync"
      });
      toast({ title: "Sinkronisasi Berhasil", description: `Akses admin diberikan ke UID: ${manualUid}` });
      setManualUid("");
      setManualEmail("");
    } catch (error: any) {
      toast({ title: "Gagal Sinkronisasi", description: error.message, variant: "destructive" });
    } finally {
      setIsSyncing(false);
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
        registeredBy: user.email,
        type: "New-Registration"
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
        msg = "Email sudah terdaftar di sistem login. Silakan gunakan fitur 'Sinkronisasi Manual' di bawah jika ia belum bisa masuk.";
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
          {/* Card: Promote Self */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white md:col-span-2">
            <CardHeader className="bg-amber-50 border-b border-amber-100">
              <CardTitle className="text-xl flex items-center gap-3 text-amber-700">
                <UserCheck className="h-5 w-5" /> Status Izin Database Anda
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2">
                  <p className="text-sm text-amber-800">
                    Email Aktif: <strong>{user.email}</strong><br />
                    UID: <code className="bg-amber-100 px-1 rounded">{user.uid}</code>
                  </p>
                  <p className="text-xs text-amber-700">
                    {hasAdminRole 
                      ? "✓ Akun Anda sudah terdaftar di koleksi roles_admin." 
                      : "⚠ Akun Anda belum terdaftar di koleksi roles_admin. Fitur admin tertentu mungkin tidak bekerja."}
                  </p>
                </div>
                <Button 
                  onClick={handlePromoteSelf} 
                  disabled={isPromoting || hasAdminRole}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold px-8 h-12"
                >
                  {hasAdminRole ? "Sudah Aktif" : isPromoting ? "Memproses..." : "Aktifkan Izin Database Saya"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card: Register New Admin */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-emerald-50 border-b border-emerald-100">
              <CardTitle className="text-xl flex items-center gap-3 text-emerald-700">
                <UserPlus className="h-5 w-5" /> Registrasi Akun Baru
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <p className="text-xs text-emerald-700">Gunakan ini untuk email yang <strong>belum pernah</strong> didaftarkan sama sekali.</p>
              <form onSubmit={handleRegisterAdmin} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Email</Label>
                  <Input 
                    type="email" 
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="h-11 bg-[#F8F7F4] border-none rounded-xl" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Password</Label>
                  <Input 
                    type="password" 
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="h-11 bg-[#F8F7F4] border-none rounded-xl" 
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isRegistering}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  {isRegistering ? "Memproses..." : "Buat Akun & Izin"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Card: Sync Existing Admin (The Fix) */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-blue-50 border-b border-blue-100">
              <CardTitle className="text-xl flex items-center gap-3 text-blue-700">
                <RefreshCw className="h-5 w-5" /> Sinkronisasi Email Terdaftar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <p className="text-xs text-blue-700">Gunakan ini jika email sudah terdaftar di sistem login tapi akses admin ditolak. (Minta UID dari user tersebut).</p>
              <form onSubmit={handleManualSync} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold">Email Terdaftar</Label>
                  <Input 
                    type="email" 
                    placeholder="email@yang-sudah-ada.com"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="h-11 bg-[#F8F7F4] border-none rounded-xl" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold">UID Akun Tersebut</Label>
                  <Input 
                    type="text" 
                    placeholder="Dapatkan UID dari halaman error login"
                    value={manualUid}
                    onChange={(e) => setManualUid(e.target.value)}
                    className="h-11 bg-[#F8F7F4] border-none rounded-xl" 
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isSyncing}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                >
                  {isSyncing ? "Menyinkronkan..." : "Berikan Akses Admin"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="md:col-span-2 flex items-start gap-3 text-xs text-[#8B4513] bg-primary/5 p-6 rounded-2xl border border-primary/10">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <div className="space-y-2">
              <p className="font-bold">Kenapa Muncul "Email Sudah Terdaftar"?</p>
              <p>
                Ini berarti akun tersebut sudah ada di sistem login (Auth), tetapi belum memiliki data izin di database (Firestore). 
                Keamanan sistem mewajibkan ID dokumen di database <strong>SAMA PERSIS</strong> dengan UID di sistem login.
              </p>
              <p>
                <strong>Solusi:</strong> Masukkan Email dan UID akun tersebut di kartu "Sinkronisasi Manual" di atas. UID bisa dilihat oleh pengguna tersebut saat mereka mencoba login dan ditolak (muncul di kotak merah).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
