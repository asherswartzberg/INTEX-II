/** Table `supporters` */
export interface Supporter {
  supporterId: number;
  supporterType: string | null;
  displayName: string | null;
  organizationName: string | null;
  firstName: string | null;
  lastName: string | null;
  relationshipType: string | null;
  region: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  createdAt: string | null;
  firstDonationDate: string | null;
  acquisitionChannel: string | null;
}
