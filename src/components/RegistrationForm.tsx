
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { LocationOption } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { MapPin, Droplet, Check, X, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection, useAuth, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, updateDoc, increment, serverTimestamp, setDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";

const formSchema = z.object({
  fullName: z.string().min(3, { message: "Nama lengkap harus diisi" }),
  nik: z.string().length(16, { message: "NIK harus 16 digit" }),
  email: z.string().email({ message: "Email tidak valid" }),
  eventSlotId: z.string({ required_error: "Silakan pilih lokasi dan tanggal" }),
});

export default function RegistrationForm() {
  const db = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const [submitted, setSubmitted] = useState(false);
  const [lastEntry, setLastEntry] = useState<any>(null);

  useEffect(() => {
    if (auth && !auth.currentUser) {
      signInAnonymously(auth).catch(console.error);
    }
  }, [auth]);

  const eventSlotsQuery = useMemoFirebase(() => collection(db, "eventSlots"), [db]);
  const { data: locations, isLoading: isLocLoading } = useCollection<LocationOption>(eventSlotsQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      nik: "",
      email: "",
      eventSlotId: "",
    },
  });

  const getQuotaRemaining = (id: string) => {
    const loc = locations?.find(l => l.id === id);
    if (!loc) return 0;
    return Math.max((loc.maxQuota || 0) - (loc.currentRegistrations || 0), 0);
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;

    const remaining = getQuotaRemaining(values.eventSlotId);
    if (remaining <= 0) {
      toast({ title: "Kuota Penuh", variant: "destructive" });
      return;
    }

    try {
      const selectedLoc = locations?.find(l => l.id === values.eventSlotId);
      const registrationId = doc(collection(db, "temp")).id;
      const regPath = `users/${user.uid}/registrations/${registrationId}`;
      
      const regData = {
        id: registrationId,
        ...values,
        locationName: selectedLoc?.locationName,
        locationDate: selectedLoc?.eventDate,
        registrationDate: serverTimestamp(),
        githubUserId: user.uid,
      };

      // 1. Simpan ke Firebase
      await setDoc(doc(db, regPath), regData);
      await updateDoc(doc(db, "eventSlots", values.eventSlotId), { currentRegistrations: increment(1) });

      // 2. Kirim Email Konfirmasi melalui API
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: values.email,
            nama: values.fullName,
          }),
        });
      } catch (emailError) {
        console.error("Gagal mengirim email konfirmasi:", emailError);
        // Kita tidak menghentikan proses sukses pendaftaran jika hanya email yang gagal
      }

      setLastEntry(regData);
      setSubmitted(true);
      form.reset();
    } catch (error) {
      toast({ title: "Gagal Mendaftar", variant: "destructive" });
    }
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
            <p className="text-[#80766E] font-body">Data pendaftaran Anda telah berhasil disimpan dan email konfirmasi telah dikirim.</p>
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
                    <FormControl><Input placeholder="Contoh: Roni Algifari" {...field} className="h-14 bg-[#F5F3EF] border-none rounded-2xl" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="nik" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#80766E]">NIK (16 Digit)</FormLabel>
                    <FormControl><Input placeholder="16 Digit Angka" maxLength={16} {...field} className="h-14 bg-[#F5F3EF] border-none rounded-2xl" /></FormControl>
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
              </div>

              <div className="space-y-6">
                <h3 className="text-2xl font-headline text-[#2D241E] font-bold">Lokasi dan Tanggal</h3>
                {isLocLoading ? <p>Memuat...</p> : (
                  <FormField control={form.control} name="eventSlotId" render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {locations?.map((option) => {
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
