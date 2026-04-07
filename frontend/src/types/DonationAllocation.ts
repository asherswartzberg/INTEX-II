/** Table `donation_allocations` */
export interface DonationAllocation {
  allocationId: number;
  donationId: number | null;
  safehouseId: number | null;
  programArea: string | null;
  amountAllocated: number | null;
  allocationDate: string | null;
  allocationNotes: string | null;
}
