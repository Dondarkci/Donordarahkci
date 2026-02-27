
export type LocationOption = {
  id: string;
  locationName: string;
  eventDate: string;
  maxQuota: number;
  currentRegistrations: number;
};

export type ParticipantRegistration = {
  id: string;
  fullName: string;
  nik: string;
  email: string;
  eventSlotId: string;
  registrationDate: any;
  githubUserId: string;
  locationName?: string;
  locationDate?: string;
};

// Alias for backward compatibility if needed in some components
export type Registration = ParticipantRegistration;
