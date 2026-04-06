/** Table `partner_assignments` */
export interface PartnerAssignment {
  assignmentId: number;
  partnerId: number | null;
  safehouseId: number | null;
  programArea: string | null;
  assignmentStart: string | null;
  assignmentEnd: string | null;
  responsibilityNotes: string | null;
  isPrimary: boolean | null;
  status: string | null;
}
