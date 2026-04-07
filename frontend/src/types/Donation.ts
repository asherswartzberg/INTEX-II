/** Table `donations` — amounts are JSON numbers (float) from API */
export interface Donation {
  donationId: number;
  supporterId: number | null;
  donationType: string | null;
  donationDate: string | null;
  isRecurring: boolean | null;
  campaignName: string | null;
  channelSource: string | null;
  currencyCode: string | null;
  amount: number | null;
  estimatedValue: number | null;
  impactUnit: string | null;
  notes: string | null;
  referralPostId: number | null;
}
