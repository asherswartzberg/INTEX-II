/** Table `in_kind_donation_items` */
export interface InKindDonationItem {
  itemId: number;
  donationId: number | null;
  itemName: string | null;
  itemCategory: string | null;
  quantity: number | null;
  unitOfMeasure: string | null;
  estimatedUnitValue: number | null;
  intendedUse: string | null;
  receivedCondition: string | null;
}
