
"use client";

import { useState, useEffect } from "react";
import { Registration, LocationOption } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Droplet, Download, Trash2, SlidersHorizontal, Search, ArrowLeft, PlusCircle, LogOut, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useAuth, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, updateDoc, getDocs, writeBatch, collectionGroup, serverTimestamp } from "firebase/firestore";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";

export default function AdminPage() {
  const db = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Login states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [editingLoc, setEditingLoc] = useState<LocationOption | null>(null);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newCapacity, setNewCapacity] = useState<number>(0);

  const regsQuery = useMemoFirebase(() => {
    if (!user || user.email !== "ronymunich@gmail.com") return null;
    return collectionGroup(db, "registrations");
  }, [db, user]);
  const { data: registrations, isLoading: isRegsLoading } = useCollection<Registration>(regsQuery);

  const slotsQuery = useMemoFirebase(() => collection(db, "eventSlots"), [db]);
  const { data: locations, isLoading: isLocsLoading } = useCollection<LocationOption>(slotsQuery);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      toast({ title: "Berhasil Masuk", description: "Selamat datang kembali, Admin." });
    } catch (error: any) {
      toast({ 
        title: "Login Gagal", 
        description: "Email atau password salah, atau Anda tidak memiliki akses.",
        variant: "destructive" 
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    toast({ title: "Berhasil Keluar" });
  };

  const handleSeedData = async () => {
    try {
      const initialSlots = [
        { id: "juanda", locationName: "Stasiun Juanda", eventDate: "2026-03-10", maxQuota: 100, currentRegistrations: 0 },
        { id: "manggarai", locationName: "Stasiun Manggarai", eventDate: "2026-03-11", maxQuota: 150, currentRegistrations: 0 },
        { id: "tanahabang", locationName: "Stasiun Tanah Abang", eventDate: "2026-03-12", maxQuota: 80, currentRegistrations: 0 },
        { id: "bogor", locationName: "Stasiun Bogor", eventDate: "2026-03-13", maxQuota: 120, currentRegistrations: 0 }
      ];

      const batch = writeBatch(db);
      initialSlots.forEach(slot => {
        const ref = doc(db, "eventSlots", slot.id);
        batch.set(ref, { ...slot, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      });
      await batch.commit();

      toast({ title: "Data Berhasil Ditambahkan" });
    } catch (e) {
      toast({ title: "Gagal Menambah Data", variant: "destructive" });
    }
  };

  const handleReset = async () => {
    try {
      const batch = writeBatch(db);
      const regsSnap = await getDocs(collectionGroup(db, "registrations"));
      regsSnap.forEach((d) => batch.delete(d.ref));

      const slotsSnap = await getDocs(collection(db, "eventSlots"));
      slotsSnap.forEach((d) => batch.update(d.ref, { currentRegistrations: 0 }));

      await batch.commit();
      toast({ title: "Data Berhasil Dihapus" });
    } catch (e) {
      toast({ title: "Gagal Reset", variant: "destructive" });
    }
  };

  const downloadExcel = () => {
    if (!registrations || registrations.length === 0) {
      toast({ title: "Gagal Download", description: "Belum ada data pendaftar.", variant: "destructive" });
      return;
    }

    const headers = ["Nama Lengkap", "NIK", "Email", "Lokasi", "Tanggal", "Waktu Daftar"];
    const rows = registrations.map(r => [
      r.fullName,
      `'${r.nik}`,
      r.email,
      r.locationName || "",
      r.locationDate || "",
      r.registrationDate ? new Date(r.registrationDate.seconds * 1000).toLocaleString('id-ID') : ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `Data_Donor_KCI.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveLocation = async () => {
    if (!editingLoc) return;
    try {
      const slotRef = doc(db, "eventSlots", editingLoc.id);
      await updateDoc(slotRef, { 
        locationName: newName,
        eventDate: newDate,
        maxQuota: newCapacity, 
        updatedAt: serverTimestamp() 
      });
      setEditingLoc(null);
      toast({ title: "Data Lokasi Diperbarui" });
    } catch (e) {
      toast({ title: "Gagal Update", variant: "destructive" });
    }
  };

  const filteredData = registrations?.filter(r => 
    r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.nik.includes(searchQuery) ||
    r.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-[#F8F5F0] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Droplet className="h-12 w-12 text-primary animate-bounce mx-auto fill-primary" />
          <p className="font-bold text-[#8B4513]">Memeriksa Otoritas Admin...</p>
        </div>
      </div>
    );
  }

  if (!user || user.email !== "ronymunich@gmail.com") {
    return (
      <div className="min-h-screen bg-[#F8F5F0] flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 rounded-[40px] border-none shadow-2xl bg-white space-y-8">
          <div className="text-center space-y-3">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-primary">
              <Lock className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-headline font-bold text-[#2D241E]">Admin Login</h1>
            <p className="text-[#80766E] font-body text-base">Halaman ini hanya untuk admin terdaftar.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="font-bold text-[#2D241E]">Email Admin</Label>
              <Input 
                type="email" 
                placeholder="admin@email.com" 
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="h-14 bg-[#F8F7F4] border-none rounded-2xl" 
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-[#2D241E]">Password</Label>
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="h-14 bg-[#F8F7F4] border-none rounded-2xl" 
                required
              />
            </div>
            <Button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full h-14 bg-primary text-white rounded-2xl text-lg font-bold shadow-lg shadow-primary/20"
            >
              {isLoggingIn ? "Memproses..." : "Masuk Sekarang"}
            </Button>
            <Link href="/" className="block">
              <Button variant="ghost" className="w-full h-12 rounded-2xl text-[#80766E]">
                <ArrowLeft className="h-4 w-4 mr-2" /> Kembali ke Beranda
              </Button>
            </Link>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F5F0] p-6 md:p-12 space-y-8 font-body">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-[#8B4513]">
          <Link href="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-bold border-r border-[#8B4513]/20 pr-4">Ke Pendaftaran</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{user.email} (Online)</span>
          </div>
        </div>
        <Button onClick={handleLogout} variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-2 font-bold">
          <LogOut className="h-4 w-4" /> Keluar
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Droplet className="h-8 w-8 text-primary fill-primary" />
            <h1 className="text-4xl font-headline font-bold text-[#2D241E]">Dashboard Admin</h1>
          </div>
          <p className="text-[#80766E] text-lg">Monitoring pendaftaran donor darah PT. KCI</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSeedData} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12 rounded-xl px-5 font-bold shadow-sm">
            <PlusCircle className="h-4 w-4" /> Seed Lokasi
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="bg-[#FDF8F8] border-[#F5E6E6] text-[#C05656] hover:bg-[#F5E6E6] gap-2 h-12 rounded-xl px-5 font-bold shadow-sm">
                <Trash2 className="h-4 w-4" /> Reset Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-3xl border-none">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-headline font-bold text-[#2D241E]">Hapus Semua Data?</AlertDialogTitle>
                <AlertDialogDescription className="text-base text-[#80766E]">Tindakan ini akan menghapus semua pendaftar.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-12 rounded-xl font-bold">Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset} className="h-12 rounded-xl bg-destructive text-white font-bold">Ya, Hapus Semua</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={downloadExcel} className="bg-[#3A7E49] hover:bg-[#2F663B] text-white gap-2 h-12 rounded-xl px-6 font-bold shadow-sm">
            <Download className="h-4 w-4" /> Download CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLocsLoading ? <p className="col-span-full text-center py-10">Memuat lokasi...</p> : 
          locations?.map((loc) => {
            const count = loc.currentRegistrations || 0;
            const percentage = Math.min((count / loc.maxQuota) * 100, 100);
            return (
              <Card key={loc.id} className="border-none shadow-sm rounded-2xl relative overflow-hidden bg-white">
                <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-[#3D1408] opacity-90" />
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-bold text-[16px] text-[#2D241E] truncate">{loc.locationName}</h3>
                      <p className="text-xs text-[#80766E]">{loc.eventDate}</p>
                    </div>
                    <button onClick={() => { setEditingLoc(loc); setNewName(loc.locationName); setNewDate(loc.eventDate); setNewCapacity(loc.maxQuota); }} className="p-1.5 hover:bg-muted rounded-full shrink-0">
                      <SlidersHorizontal className="h-4 w-4 text-[#80766E]/60" />
                    </button>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-[#3D1408]">{count}</span>
                    <span className="text-[#80766E] text-sm font-medium">/ {loc.maxQuota} Slot</span>
                  </div>
                  <div className="pt-1">
                    <div className="h-2 w-full bg-[#E5E7EB] rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-700" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        }
      </div>

      <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-[900px]">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#80766E]/40" />
              <Input placeholder="Cari nama, NIK, atau email..." className="pl-14 h-14 bg-[#F8F7F4] border-none rounded-2xl text-base" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="bg-white border border-[#E5E7EB] rounded-full px-6 py-2.5 shadow-sm">
              <span className="font-bold text-base text-[#2D241E]">Total: {filteredData.length} Orang</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead className="text-right">Waktu Daftar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isRegsLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-20 italic">Memuat data pendaftar...</TableCell></TableRow>
                ) : filteredData.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-20 italic">Belum ada data pendaftar.</TableCell></TableRow>
                ) : (
                  filteredData.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell className="font-bold">{reg.fullName}</TableCell>
                      <TableCell className="font-bold">{reg.nik}</TableCell>
                      <TableCell>{reg.email}</TableCell>
                      <TableCell className="font-bold">{reg.locationName}</TableCell>
                      <TableCell className="text-right text-[#A09891] text-sm">
                        {reg.registrationDate ? new Date(reg.registrationDate.seconds * 1000).toLocaleString('id-ID') : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      <Dialog open={!!editingLoc} onOpenChange={(open) => !open && setEditingLoc(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-headline font-bold">Edit Detail Lokasi</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-bold">Nama Lokasi</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="h-12 bg-[#F8F7F4] border-none rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold">Tanggal Event</Label>
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-12 bg-[#F8F7F4] border-none rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold">Kapasitas</Label>
              <Input type="number" value={newCapacity} onChange={(e) => setNewCapacity(parseInt(e.target.value) || 0)} className="h-12 bg-[#F8F7F4] border-none rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingLoc(null)} className="h-12 rounded-xl">Batal</Button>
            <Button onClick={handleSaveLocation} className="h-12 rounded-xl bg-primary text-white">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
