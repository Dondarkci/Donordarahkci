
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LocationOption } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { MapPin, Droplet, Check, X, Mail, ShieldCheck, Briefcase, Contact } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection, useAuth, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, increment, serverTimestamp } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  fullName: z.string().min(3, { message: "Nama lengkap harus diisi" }),
  email: z.string().email({ message: "Email tidak valid" }),
  category: z.enum(["Pegawai KCI", "Umum"], { required_error: "Pilih kategori peserta" }),
  bloodType: z.string({ required_error: "Pilih golongan darah" }),
  nik: z.string().optional(),
  nipp: z.string().optional(),
  unitKerja: z.string().optional(),
  eventSlotId: z.string({ required_error: "Silakan pilih lokasi dan tanggal" }),
  agreement1: z.boolean().refine(val => val === true, { message: "Persetujuan ini wajib dicentang" }),
  agreement2: z.boolean().refine(val => val === true, { message: "Persetujuan ini wajib dicentang" }),
  agreement3: z.boolean().refine(val => val === true, { message: "Persetujuan ini wajib dicentang" }),
}).superRefine((data, ctx) => {
  if (data.category === "Umum") {
    if (!data.nik || data.nik.length !== 16) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "NIK harus 16 digit",
        path: ["nik"],
      });
    }
  } else if (data.category === "Pegawai KCI") {
    if (!data.nipp || data.nipp.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "NIPP/NIK harus diisi",
        path: ["nipp"],
      });
    }
    if (!data.unitKerja || data.unitKerja.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Unit Kerja harus diisi",
        path: ["unitKerja"],
      });
    }
  }
});

const BLOOD_TYPES = ["A", "B", "AB", "O", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function RegistrationForm() {
  const db = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const [submitted, setSubmitted] = useState(false);
  const [lastEntry, setLastEntry] = useState<any>(null);

  useEffect(() => {
    if (auth && !auth.currentUser) {
      signInAnonymously(auth).catch((err) => {
        console.error("Anonymous sign-in failed:", err);
      });
    }
  }, [auth]);

  const eventSlotsQuery = useMemoFirebase(() => collection(db, "eventSlots"), [db]);
  const { data: locations, isLoading: isLocLoading } = useCollection<LocationOption>(eventSlotsQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      category: "Pegawai KCI",
      bloodType: "",
      nik: "",
      nipp: "",
      unitKerja: "",
      eventSlotId: "",
      agreement1: false,
      agreement2: false,
      agreement3: false,
    },
  });

  const category = form.watch("category");

  const getQuotaRemaining = (id: string) => {
    const loc = locations?.find(l => l.id === id);
    if (!loc) return 0;
    return Math.max((loc.maxQuota || 0) - (loc.currentRegistrations || 0), 0);
  };

  const activeLocations = locations?.filter(loc => 
    loc.locationName && 
    loc.locationName.trim() !== ""
  ) || [];

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({ 
        title: "Sesi tidak valid", 
        description: "Mohon tunggu sebentar agar sistem dapat mengenali sesi Anda.", 
        variant: "destructive" 
      });
      return;
    }

    const selectedLoc = locations?.find(l => l.id === values.eventSlotId);
    if (!selectedLoc) {
      toast({ title: "Lokasi tidak valid", description: "Silakan pilih lokasi kembali.", variant: "destructive" });
      return;
    }

    const remaining = getQuotaRemaining(values.eventSlotId);
    if (remaining <= 0) {
      toast({ title: "Kuota Penuh", description: "Maaf, kuota untuk lokasi ini sudah habis.", variant: "destructive" });
      return;
    }

    const registrationId = doc(collection(db, "temp")).id;
    const regPath = `users/${user.uid}/registrations/${registrationId}`;
    const regRef = doc(db, regPath);
    
    const regData = {
      id: registrationId,
      fullName: values.fullName,
      nik: values.category === "Umum" ? values.nik : "",
      nipp: values.category === "Pegawai KCI" ? values.nipp : "",
      unitKerja: values.category === "Pegawai KCI" ? values.unitKerja : "",
      email: values.email,
      category: values.category,
      bloodType: values.bloodType,
      eventSlotId: values.eventSlotId,
      locationName: selectedLoc.locationName || "Lokasi Tidak Diketahui",
      locationDate: selectedLoc.eventDate || "Tanggal Tidak Diketahui",
      registrationDate: serverTimestamp(),
      githubUserId: user.uid,
    };

    setDocumentNonBlocking(regRef, regData, { merge: true });
    
    const slotRef = doc(db, "eventSlots", values.eventSlotId);
    updateDocumentNonBlocking(slotRef, { 
      currentRegistrations: increment(1) 
    });

    fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: values.email,
        nama: values.fullName,
        lokasi: selectedLoc.locationName,
        tanggal: selectedLoc.eventDate,
      }),
    }).catch(err => console.error("Email send failed:", err));

    setLastEntry(regData);
    setSubmitted(true);
    form.reset();
  }

  if (submitted && lastEntry) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]">
        <div className="relative w-full max-w-[480px] bg-white rounded-[40px] p-8 md:p-12 shadow-2xl">
          <button onClick={() => setSubmitted(false)} className="absolute right-8 top-8 text-[#80766E]/60 hover:text-[#2D241E]">
            <X className="h-6 w-6" />
          </button>
          <div className="flex justify-center mb-8">
            <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-[#E9F5EB]">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#4CAF50]">
                <Check className="h-8 w-8 text-white stroke-[4px]" />
              </div>
            </div>
          </div>
          <div className="text-center space-y-3 mb-8">
            <h2 className="text-[32px] font-bold text-[#2D241E] font-headline">Pendaftaran Berhasil</h2>
            <p className="text-[#80766E] font-body">Pendaftaran anda telah berhasil di simpan. Silahkan buka email anda untuk melihat pesan notifikasi.</p>
          </div>
          <Button onClick={() => setSubmitted(false)} className="w-full h-[64px] bg-primary text-white rounded-[20px] text-xl font-bold">
            Selesai
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <Card className="border-none shadow-none bg-white rounded-[32px] overflow-hidden">
        <CardContent className="p-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#80766E]">Nama Lengkap</FormLabel>
                    <FormControl><Input placeholder="Contoh: Arlon Algifari" {...field} className="h-14 bg-[#F5F3EF] border-none rounded-2xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#80766E]">Alamat Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#80766E]/40" />
                        <Input placeholder="email@contoh.com" type="email" {...field} className="h-14 bg-[#F5F3EF] border-none rounded-2xl pl-12" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[#80766E]">Kategori</FormLabel>
                      <FormControl>
                        <div className="h-14 bg-[#F5F3EF] border-none rounded-2xl flex items-center px-6">
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-row space-x-8"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="Pegawai KCI" className="h-5 w-5 border-primary text-primary" />
                              </FormControl>
                              <FormLabel className="font-normal text-base cursor-pointer text-[#2D241E]">Pegawai KCI</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="Umum" className="h-5 w-5 border-primary text-primary" />
                              </FormControl>
                              <FormLabel className="font-normal text-base cursor-pointer text-[#2D241E]">Umum</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="bloodType" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[#80766E]">Golongan Darah</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-14 bg-[#F5F3EF] border-none rounded-2xl">
                            <SelectValue placeholder="Pilih Golongan Darah" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-2xl border-none shadow-xl">
                          {BLOOD_TYPES.map((type) => (
                            <SelectItem key={type} value={type} className="rounded-lg">
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Conditional Fields based on Category */}
                {category === "Umum" ? (
                  <FormField control={form.control} name="nik" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-[#80766E]">NIK (16 Digit)</FormLabel>
                      <FormControl><Input placeholder="Masukkan 16 Digit NIK Anda" maxLength={16} {...field} className="h-14 bg-[#F5F3EF] border-none rounded-2xl" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                ) : (
                  <>
                    <FormField control={form.control} name="nipp" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#80766E]">NIPP/NIK</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Contact className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#80766E]/40" />
                            <Input placeholder="Masukkan NIPP atau NIK Pegawai" {...field} className="h-14 bg-[#F5F3EF] border-none rounded-2xl pl-12" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="unitKerja" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#80766E]">Unit Kerja</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#80766E]/40" />
                            <Input placeholder="Contoh: IT Support, Stasiun Sudirman, dll" {...field} className="h-14 bg-[#F5F3EF] border-none rounded-2xl pl-12" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </>
                )}
              </div>

              <div className="space-y-6">
                <h3 className="text-2xl font-headline text-[#2D241E] font-bold">Lokasi dan Tanggal</h3>
                {isLocLoading ? <p>Memuat ketersediaan lokasi...</p> : activeLocations.length === 0 ? <p className="text-[#80766E] italic">Belum ada lokasi yang tersedia saat ini.</p> : (
                  <FormField control={form.control} name="eventSlotId" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {activeLocations.map((option) => {
                            const remaining = getQuotaRemaining(option.id);
                            const isFull = remaining <= 0;
                            return (
                              <FormItem key={option.id}>
                                <FormControl><RadioGroupItem value={option.id} id={option.id} className="peer sr-only" disabled={isFull} /></FormControl>
                                <label htmlFor={option.id} className={cn("flex items-center gap-4 p-5 border border-[#EAE7E2] rounded-[24px] cursor-pointer transition-all bg-white peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5", isFull ? "opacity-50 cursor-not-allowed bg-[#F8F7F4]" : "hover:border-primary/30")}>
                                  <MapPin className="h-6 w-6 text-[#80766E]" />
                                  <div className="flex-grow">
                                    <div className="font-bold text-[#2D241E]">{option.locationName}</div>
                                    <div className="text-xs text-[#80766E]">{option.eventDate}</div>
                                  </div>
                                  <span className={cn("text-[11px] font-bold px-3 py-1 rounded-full", isFull ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600")}>
                                    {isFull ? "Penuh" : `${remaining} Slot`}
                                  </span>
                                </label>
                              </FormItem>
                            );
                          })}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </div>

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="agreement1"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-4 space-y-0 px-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1 h-6 w-6 rounded-lg"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-tight">
                        <FormLabel className="text-[14px] text-[#2D241E] font-normal cursor-pointer text-justify font-body">
                          Saya menyatakan telah membaca dan memahami Kebijakan Privasi Donor Darah PT Kereta Commuter Indonesia, dan dengan ini memberikan persetujuan kepada PT Kereta Commuter Indonesia untuk mengumpulkan, menggunakan dan menyimpan data pribadi saya untuk keperluan pendaftaran dan pelaksanaan donor darah.
                        </FormLabel>
                        <FormLabel />
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="agreement2"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-4 space-y-0 px-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1 h-6 w-6 rounded-lg"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-tight">
                        <FormLabel className="text-[14px] text-[#2D241E] font-normal cursor-pointer text-justify font-body">
                          Saya memberikan persetujuan secara sadar dan ekspilist kepada PT Kereta Commuter Indonesia untuk memproses Data Pribadi Spesifik berupa Nomor Induk Kependudukan guna keperluan donor darah, sesuai ketentuan perundang-undangan.
                        </FormLabel>
                        <FormLabel />
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="agreement3"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-4 space-y-0 px-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1 h-6 w-6 rounded-lg"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-tight">
                        <FormLabel className="text-[14px] text-[#2D241E] font-normal cursor-pointer text-justify font-body">
                          Saya menyetujui bahwa Data Pribadi saya dapat dibagikan kepada pihak yang berwenang hanya untuk keperluan pelaksanaan donor darah.
                        </FormLabel>
                        <FormLabel />
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <div className="pt-2 flex justify-center">
                  <Dialog>
                    <DialogTrigger asChild>
                      <button type="button" className="text-primary font-bold underline hover:opacity-70 transition-opacity">
                        Kebijakan Privasi
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl w-[90vw] rounded-[32px] overflow-hidden p-0 border-none">
                      <DialogHeader className="p-8 bg-primary text-white">
                        <DialogTitle className="text-3xl font-headline font-bold flex items-center gap-3">
                          <ShieldCheck className="h-8 w-8" /> Kebijakan Privasi
                        </DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="max-h-[70vh] p-8 md:p-10">
                        <div className="space-y-8 text-[#2D241E] font-body text-base leading-relaxed text-justify">
                          <section>
                            <h4 className="font-bold text-lg mb-3">Pendahuluan</h4>
                            <p>
                              PT Kereta Commuter Indonesia berkomitmen melindungi privasi dan data pribadi Anda sesuai dengan ketentuan Undang-Undang Perlindungan Data Pribadi (UU PDP) Indonesia. Kebijakan Privasi ini menjelaskan bagaimana Kami mengumpulkan, menggunakan, menyimpan, dan melindungi data pribadi yang Anda berikan saat melakukan pendaftaran donor darah.
                            </p>
                          </section>

                          <section>
                            <h4 className="font-bold text-lg mb-3">1. Data Pribadi yang Kami Kumpulkan</h4>
                            <ul className="list-none space-y-1">
                              <li>a. Nama lengkap</li>
                              <li>b. Nomor Induk Kependudukan (NIK) atau NIPP</li>
                              <li>c. Alamat email</li>
                              <li>d. Kategori peserta (Pegawai KCI / Umum)</li>
                              <li>e. Lokasi dan tanggal donor yang dipilih</li>
                            </ul>
                          </section>

                          <section>
                            <h4 className="font-bold text-lg mb-3">2. Tujuan Pengumpulan dan Penggunaan Data</h4>
                            <p className="mb-2">Data yang dikumpulkan digunakan untuk:</p>
                            <ul className="list-none space-y-1">
                              <li>a. Memproses pendaftaran dan verifikasi peserta donor darah</li>
                              <li>b. Mengatur jadwal dan lokasi kegiatan donor darah</li>
                              <li>c. Berkomunikasi terkait kegiatan dan informasi penting lainnya</li>
                              <li>d. Melakukan pelaporan kepada pihak terkait seperti instansi kesehatan</li>
                              <li>e. Keperluan administrasi</li>
                            </ul>
                          </section>

                          <section>
                            <h4 className="font-bold text-lg mb-3">3. Penyimpanan dan Retensi Data</h4>
                            <p className="mb-2">Data pribadi Anda akan disimpan selama:</p>
                            <ul className="list-none space-y-1">
                              <li>a. Kegiatan donor darah berlangsung</li>
                              <li>b. Maksimal 1 (satu) tahun setelah kegiatan selesai, kemudian data akan dihapus atau dianonimkan sesuai kebijakan Kami</li>
                            </ul>
                          </section>

                          <section>
                            <h4 className="font-bold text-lg mb-3">4. Pengungkapan Data kepada Pihak Ketiga</h4>
                            <p className="mb-2">Data pribadi Anda dapat dibagikan kepada:</p>
                            <ul className="list-none space-y-1">
                              <li>a. Instansi kesehatan seperti Palang Merah Indonesia (PMI) atau mitra medis lain yang terlibat</li>
                              <li>b. Pihak internal PT Kereta Commuter Indonesia yang berwenang</li>
                              <li>c. Pihak lain apabila diwajibkan oleh hukum</li>
                            </ul>
                            <p className="mt-2 italic">Kami memastikan bahwa pihak ketiga wajib menjaga kerahasiaan dan keamanan data yang diberikan.</p>
                          </section>

                          <section>
                            <h4 className="font-bold text-lg mb-3">6. Keamanan Data Pribadi</h4>
                            <p>
                              Kami menerapkan langkah-langkah keamanan yang sesuai untuk melindungi data pribadi Anda, termasuk pembatasan akses hanya kepada pihak yang berwenang.
                            </p>
                          </section>

                          <section>
                            <h4 className="font-bold text-lg mb-3">7. Hak Anda sebagai Subjek Data</h4>
                            <p className="mb-2">Anda berhak untuk:</p>
                            <ul className="list-none space-y-1">
                              <li>a. Memperbaiki data jika ada kesalahan</li>
                              <li>b. Mengajukan permintaan penghapusan data</li>
                              <li>c. Menarik persetujuan pengolahan data kapan saja</li>
                              <li>d. Mengajukan keberatan terhadap pemrosesan data</li>
                            </ul>
                          </section>

                          <section className="bg-[#F8F7F4] p-6 rounded-2xl border border-[#EAE7E2]">
                            <h4 className="font-bold text-lg mb-3">8. Kontak Pengelola Data Pribadi</h4>
                            <p>Untuk pertanyaan, Anda dapat menghubungi:</p>
                            <p className="font-bold text-primary mt-1">Email: dondar.kcj@kci.id</p>
                          </section>
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full h-16 text-xl font-bold bg-primary text-white rounded-[20px] shadow-lg">
                <Droplet className="h-6 w-6 fill-current mr-2" /> 
                {form.formState.isSubmitting ? "Memproses..." : "Daftar Sekarang"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
