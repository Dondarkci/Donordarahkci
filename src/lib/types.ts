
export type LocationOption = {
  id: string;
  locationName: string;
  eventDate: string;
  maxQuota: number;
  currentRegistrations: number;
};

export type Registration = {
  id: string;
  fullName: string;
  nik: string;
  whatsappNumber: string;
  eventSlotId: string;
  registrationDate: any;
  githubUserId: string;
  locationName?: string;
  locationDate?: string;
};
