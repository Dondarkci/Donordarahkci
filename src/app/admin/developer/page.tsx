
"use client";

import { useState, useEffect } from "react";
import { useUser, useFirestore, useMemoFirebase, useDoc, useCollection } from "@/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, UserPlus, ShieldCheck, UserCheck, RefreshCw, Users, Trash2, Loader2, Key, Send, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { doc, setDoc, serverTimestamp, collection, deleteDoc } from "firebase/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DeveloperSettingsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  
  // Authorization check
  const adminRoleRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(db, "roles_admin", user.uid);
  }, [db, user]);
  
  const { data: adminRoleData, isLoading: isAdminCheckLoading } = useDoc(adminRoleRef);

  // Case-insensitive super admin check
  const isSuperAdmin = user?.email?.toLowerCase() === "ronymunich@gmail.com";
  const hasAdminRole = !!adminRoleData;
  const isAuthorized = isSuperAdmin || hasAdminRole;

  // Final check to see if we've determined the user's authority
  const isDeterminingAccess = isUserLoading || (!!user && isAdminCheckLoading);

  // API Settings State
  const apiSettingsRef = useMemoFirebase(() => {
    if (!isAuthorized || isDeterminingAccess) return null;
    return doc(db, "settings", "api");
  }, [db, isAuthorized, isDeterminingAccess]);

  const { data: apiData, isLoading: isApiLoading } = useDoc(apiSettingsRef);
  const [resendKey, setResendKey] = useState("");
  const [fonnteToken, setFonnteToken] = useState("");
  const [isSavingApi, setIsSavingApi] = useState(false);

  useEffect(() => {
    if (apiData) {
      setResendKey(apiData.resendApiKey || "");
      setFonnteToken(apiData.fonnteToken || "");
    }
  }, [apiData]);

  // Redirection if unauthorized
  useEffect(() => {
    if (!isDeterminingAccess) {
      if (!user || !isAuthorized) {
        router.replace("/admin");
      }
    }
  }, [user, isDeterminingAccess, isAuthorized, router]);

  // List all admins
  const adminsQuery = useMemoFirebase(() => collection(db, "roles_admin"), [db]);
  const { data: adminList, isLoading: isListLoading } = useCollection(adminsQuery);

  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [manualUid, setManualUid] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  if (isDeterminingAccess) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
          <p className="font-bold text-[#8B4513]">Memverifikasi izin developer...</p>
        </div>
      </div>
    );
  }
  
  if (!user || !isAuthorized) {
    return null;
  }

  const handleSaveApi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiSettingsRef) return;
    setIsSavingApi(true);
    try {
      await setDoc(apiSettingsRef, {
        resendApiKey: resendKey.trim(),
        fonnteToken: fonnteToken.trim(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.email
      }, { merge: true });
      toast({ title: "Berhasil", description: "Konfigurasi API telah disimpan." });
    } catch (error: any) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } finally {
      setIsSavingApi(false);
    }
  };

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
      toast({ title: "Berhasil", description: "Izin administrator Anda telah diaktifkan." });
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
      setManualUid("");
      setManualEmail("");
      toast({ title: "Sinkronisasi Berhasil", description: `Hak admin diberikan ke UID: ${manualUid}` });
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
      setNewAdminEmail("");
      setNewAdminPassword("");
      toast({ title: "Pendaftaran Berhasil", description: `Admin baru ${newAdminEmail} telah didaftarkan.` });
    } catch (error: any) {
      let msg = error.message;
      if (error.code === 'auth/email-already-in-use') {
        msg = "Email sudah terdaftar. Gunakan 'Sinkronisasi Manual' jika ingin memberi akses admin.";
      }
      toast({ title: "Gagal Mendaftar", description: msg, variant: "destructive" });
    } finally {
      await deleteApp(tempApp);
      setIsRegistering(false);
    }
  };

  const handleDeleteAdmin = async (uid: string, email: string) => {
    if (uid === user.uid) {
      toast({ title: "Gagal", description: "Anda tidak bisa menghapus izin Anda sendiri.", variant: "destructive" });
      return;
    }
    if (email?.toLowerCase() === "ronymunich@gmail.com") {
      toast({ title: "Gagal", description: "Akun Super Admin tidak bisa dihapus.", variant: "destructive" });
      return;
    }
    try {
      await deleteDoc(doc(db, "roles_admin", uid));
      toast({ title: "Berhasil", description: `Izin admin untuk ${email} telah dicabut.` });
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
              <ArrowLeft className="h-4 w-4" /> Kembali ke Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Mode Pengembang Aktif</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-headline font-bold text-[#2D241E]">Manajemen Hak Akses</h1>
          <p className="text-[#80766E]">Kelola akun administrator dan konfigurasi API eksternal.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Admin List Card */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white md:col-span-2">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-xl flex items-center gap-3 text-primary">
                <Users className="h-5 w-5" /> Daftar Administrator Aktif
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>UID (User ID)</TableHead>
                    <TableHead>Sumber</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isListLoading ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8">Memuat daftar...</TableCell></TableRow>
                  ) : adminList?.map((admin) => {
                    const isSuperAccount = admin.email?.toLowerCase() === "ronymunich@gmail.com";
                    return (
                      <TableRow key={admin.id}>
                        <TableCell className="font-bold">{admin.email}</TableCell>
                        <TableCell className="text-xs font-mono opacity-60">{admin.uid || admin.id}</TableCell>
                        <TableCell><span className="text-[10px] bg-muted px-2 py-0.5 rounded-full uppercase font-bold">{admin.type || "Admin"}</span></TableCell>
                        <TableCell className="text-right">
                          {isSuperAccount ? (
                            <div className="flex justify-end pr-2">
                              <ShieldCheck className="h-4 w-4 text-emerald-500" title="Super Admin Dilindungi" />
                            </div>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Cabut Akses Admin"
                              disabled={admin.id === user.uid}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* API Configuration Card */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white md:col-span-2">
            <CardHeader className="bg-amber-50 border-b border-amber-100">
              <CardTitle className="text-xl flex items-center gap-3 text-amber-700">
                <Key className="h-5 w-5" /> Konfigurasi Layanan API
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveApi} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-2">
                      <Send className="h-3 w-3" /> Resend API Key (Email)
                    </Label>
                    <Input 
                      type="password" 
                      placeholder="re_..."
                      value={resendKey}
                      onChange={(e) => setResendKey(e.target.value)}
                      className="h-11 bg-[#F8F7F4] border-none rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold flex items-center gap-2">
                      <Smartphone className="h-3 w-3" /> Fonnte Token (WhatsApp)
                    </Label>
                    <Input 
                      type="password" 
                      placeholder="token..."
                      value={fonnteToken}
                      onChange={(e) => setFonnteToken(e.target.value)}
                      className="h-11 bg-[#F8F7F4] border-none rounded-xl"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button 
                    type="submit" 
                    disabled={isSavingApi || isApiLoading}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-8 rounded-xl font-bold h-11"
                  >
                    {isSavingApi ? "Menyimpan..." : "Simpan Konfigurasi API"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Promote Self Card */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-emerald-50 border-b border-emerald-100">
              <CardTitle className="text-xl flex items-center gap-3 text-emerald-700">
                <UserCheck className="h-5 w-5" /> Status Izin Anda
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm">Email: <strong>{user.email}</strong></p>
                <p className="text-xs opacity-60">UID: <code>{user.uid}</code></p>
              </div>
              <Button 
                onClick={handlePromoteSelf} 
                disabled={isPromoting || hasAdminRole}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold h-11"
              >
                {hasAdminRole ? "Izin Sudah Terdaftar" : isPromoting ? "Memproses..." : "Daftarkan Akun Saya"}
              </Button>
            </CardContent>
          </Card>

          {/* Add Admin Card */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-blue-50 border-b border-blue-100">
              <CardTitle className="text-xl flex items-center gap-3 text-blue-700">
                <UserPlus className="h-5 w-5" /> Tambah Admin Baru
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleRegisterAdmin} className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Email Baru</Label>
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
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold h-11"
                >
                  {isRegistering ? "Mendaftarkan..." : "Daftarkan & Beri Akses"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Sync Manual Card */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white md:col-span-2">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="text-xl flex items-center gap-3 text-slate-700">
                <RefreshCw className="h-5 w-5" /> Sinkronisasi Manual (via UID)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleManualSync} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Email Pengguna</Label>
                  <Input 
                    type="email" 
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    className="h-11 bg-[#F8F7F4] border-none rounded-xl" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">UID (User ID)</Label>
                  <Input 
                    type="text" 
                    value={manualUid}
                    onChange={(e) => setManualUid(e.target.value)}
                    className="h-11 bg-[#F8F7F4] border-none rounded-xl" 
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    type="submit" 
                    disabled={isSyncing}
                    className="w-full h-11 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-bold"
                  >
                    {isSyncing ? "Menghubungkan..." : "Berikan Akses"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
