
"use client";

import { useState } from "react";
import { useUser, useFirestore, useMemoFirebase, useDoc, useCollection } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, UserPlus, ShieldCheck, UserCheck, RefreshCw, Users, Trash2 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { doc, setDoc, serverTimestamp, collection, deleteDoc } from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DeveloperSettingsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  
  // Authorization check
  const adminRoleRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "roles_admin", user.uid);
  }, [db, user]);
  const { data: adminRoleData, isLoading: isAdminCheckLoading } = useDoc(adminRoleRef);

  // List all admins for management
  const adminsQuery = useMemoFirebase(() => collection(db, "roles_admin"), [db]);
  const { data: adminList, isLoading: isListLoading } = useCollection(adminsQuery);

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
      const userCredential = await createUserWithEmailAndPassword(tempAuth, newAdminEmail, newAdminPassword);
      const newUserUid = userCredential.user.uid;

      const adminRef = doc(db, "roles_admin", newUserUid);
      await setDoc(adminRef, {
        email: newAdminEmail,
        uid: newUserUid,
        createdAt: serverTimestamp(),
        registeredBy: user.email,
        type: "New-Registration"
      });

      toast({ title: "Pendaftaran Berhasil", description: `Admin ${newAdminEmail} telah terdaftar.` });
      setNewAdminEmail("");
      setNewAdminPassword("");
    } catch (error: any) {
      let msg = error.message;
      if (error.code === 'auth/email-already-in-use') {
        msg = "Email sudah terdaftar. Gunakan 'Sinkronisasi Manual' jika belum memiliki akses.";
      }
      toast({ title: "Gagal Mendaftar", description: msg, variant: "destructive" });
    } finally {
      await deleteApp(tempApp);
      setIsRegistering(false);
    }
  };

  const handleDeleteAdmin = async (uid: string, email: string) => {
    if (uid === user.uid) {
      toast({ title: "Gagal", description: "Anda tidak bisa menghapus akun Anda sendiri.", variant: "destructive" });
      return;
    }
    if (email === "ronymunich@gmail.com") {
      toast({ title: "Gagal", description: "Super Admin tidak bisa dihapus.", variant: "destructive" });
      return;
    }

    try {
      await deleteDoc(doc(db, "roles_admin", uid));
      toast({ title: "Berhasil", description: `Akses admin ${email} telah dicabut.` });
    } catch (error: any) {
      toast({ title: "Gagal Menghapus", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5F0] p-6 md:p-12 space-y-8 font-body">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/admin">
            <Button variant="ghost" className="text-[#8B4513] hover:bg-[#8B4513]/5 gap-2 font-bold">
              <ArrowLeft className="h-4 w-4" /> Dashboard Admin
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Akses Admin Terverifikasi</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-headline font-bold text-[#2D241E]">Manajemen Hak Akses</h1>
          <p className="text-[#80766E]">Kelola akun administrator dan sinkronisasi izin database.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Admin List Card */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white md:col-span-2">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-xl flex items-center gap-3 text-primary">
                <Users className="h-5 w-5" /> Daftar Administrator Terdaftar
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>UID</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isListLoading ? (
                    <TableRow key="loading-row"><TableCell colSpan={4} className="text-center py-8">Memuat daftar...</TableCell></TableRow>
                  ) : adminList?.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-bold">{admin.email}</TableCell>
                      <TableCell className="text-xs font-mono opacity-60">{admin.id}</TableCell>
                      <TableCell><span className="text-[10px] bg-muted px-2 py-0.5 rounded-full uppercase font-bold">{admin.type || "Admin"}</span></TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Card: Promote Self */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-amber-50 border-b border-amber-100">
              <CardTitle className="text-xl flex items-center gap-3 text-amber-700">
                <UserCheck className="h-5 w-5" /> Status Izin Anda
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-amber-800">
                  Email: <strong>{user.email}</strong><br />
                  UID: <code className="bg-amber-100 px-1 rounded text-xs">{user.uid}</code>
                </p>
                <p className="text-xs text-amber-700">
                  {hasAdminRole 
                    ? "✓ Anda memiliki izin penuh di database." 
                    : "⚠ Izin database belum dikonfigurasi."}
                </p>
              </div>
              <Button 
                onClick={handlePromoteSelf} 
                disabled={isPromoting || hasAdminRole}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold"
              >
                {hasAdminRole ? "Izin Sudah Aktif" : isPromoting ? "Memproses..." : "Aktifkan Izin Saya"}
              </Button>
            </CardContent>
          </Card>

          {/* Card: Register New Admin */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-emerald-50 border-b border-emerald-100">
              <CardTitle className="text-xl flex items-center gap-3 text-emerald-700">
                <UserPlus className="h-5 w-5" /> Registrasi Akun Baru
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <form onSubmit={handleRegisterAdmin} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Email</Label>
                  <Input 
                    type="email" 
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="h-10 bg-[#F8F7F4] border-none rounded-xl" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Password</Label>
                  <Input 
                    type="password" 
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="h-10 bg-[#F8F7F4] border-none rounded-xl" 
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={isRegistering}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  {isRegistering ? "Memproses..." : "Buat Akun & Beri Izin"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Card: Sync Existing Admin */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white md:col-span-2">
            <CardHeader className="bg-blue-50 border-b border-blue-100">
              <CardTitle className="text-xl flex items-center gap-3 text-blue-700">
                <RefreshCw className="h-5 w-5" /> Sinkronisasi Manual (UID)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleManualSync} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Email Terdaftar</Label>
                  <Input 
                    type="email" 
                    placeholder="email@user.com"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="h-11 bg-[#F8F7F4] border-none rounded-xl" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">UID User</Label>
                  <Input 
                    type="text" 
                    placeholder="Dapatkan UID dari halaman error login"
                    value={manualUid}
                    onChange={(e) => setManualUid(e.target.value)}
                    className="h-11 bg-[#F8F7F4] border-none rounded-xl" 
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    type="submit" 
                    disabled={isSyncing}
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                  >
                    {isSyncing ? "Menyinkronkan..." : "Sinkronkan Akses"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="md:col-span-2 flex items-start gap-3 text-xs text-[#8B4513] bg-primary/5 p-6 rounded-2xl border border-primary/10">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <p className="font-bold">Informasi Keamanan</p>
              <p>Halaman ini dapat diakses oleh semua administrator yang telah diverifikasi di database.</p>
              <p>Pastikan Anda hanya memberikan akses kepada personil yang berwenang. Segala aktivitas pendaftaran admin baru akan dicatat menggunakan email pelaksana.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
