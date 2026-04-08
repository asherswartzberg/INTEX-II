using Microsoft.EntityFrameworkCore;

namespace IntexAPI.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<DonationAllocation> DonationAllocations => Set<DonationAllocation>();
    public DbSet<EducationRecord> EducationRecords => Set<EducationRecord>();
    public DbSet<HealthWellbeingRecord> HealthWellbeingRecords => Set<HealthWellbeingRecord>();
    public DbSet<IncidentReport> IncidentReports => Set<IncidentReport>();
    public DbSet<InterventionPlan> InterventionPlans => Set<InterventionPlan>();
    public DbSet<InKindDonationItem> InKindDonationItems => Set<InKindDonationItem>();
    public DbSet<PartnerAssignment> PartnerAssignments => Set<PartnerAssignment>();
    public DbSet<ProcessRecording> ProcessRecordings => Set<ProcessRecording>();
    public DbSet<PublicImpactSnapshot> PublicImpactSnapshots => Set<PublicImpactSnapshot>();
    public DbSet<SafehouseMonthlyMetric> SafehouseMonthlyMetrics => Set<SafehouseMonthlyMetric>();
    public DbSet<SocialMediaPost> SocialMediaPosts => Set<SocialMediaPost>();
    public DbSet<HomeVisitation> HomeVisitations => Set<HomeVisitation>();

    // ML prediction tables (read-only, written by Python pipelines)
    public DbSet<DonorRiskScore> DonorRiskScores => Set<DonorRiskScore>();
    public DbSet<ResidentRiskScore> ResidentRiskScores => Set<ResidentRiskScore>();
    public DbSet<SocialMediaRecommendation> SocialMediaRecommendations => Set<SocialMediaRecommendation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // PKs are not auto-increment — tables were loaded from CSVs without IDENTITY
        modelBuilder.Entity<Resident>().Property(e => e.ResidentId).ValueGeneratedNever();
        modelBuilder.Entity<Safehouse>().Property(e => e.SafehouseId).ValueGeneratedNever();
        modelBuilder.Entity<Partner>().Property(e => e.PartnerId).ValueGeneratedNever();
        modelBuilder.Entity<Supporter>().Property(e => e.SupporterId).ValueGeneratedNever();
        modelBuilder.Entity<Donation>().Property(e => e.DonationId).ValueGeneratedNever();
        modelBuilder.Entity<DonationAllocation>().Property(e => e.AllocationId).ValueGeneratedNever();
        modelBuilder.Entity<InKindDonationItem>().Property(e => e.ItemId).ValueGeneratedNever();
        modelBuilder.Entity<PartnerAssignment>().Property(e => e.AssignmentId).ValueGeneratedNever();
        modelBuilder.Entity<ProcessRecording>().Property(e => e.RecordingId).ValueGeneratedNever();
        modelBuilder.Entity<HomeVisitation>().Property(e => e.VisitationId).ValueGeneratedNever();
        modelBuilder.Entity<EducationRecord>().Property(e => e.EducationRecordId).ValueGeneratedNever();
        modelBuilder.Entity<HealthWellbeingRecord>().Property(e => e.HealthRecordId).ValueGeneratedNever();
        modelBuilder.Entity<InterventionPlan>().Property(e => e.PlanId).ValueGeneratedNever();
        modelBuilder.Entity<IncidentReport>().Property(e => e.IncidentId).ValueGeneratedNever();
        modelBuilder.Entity<SocialMediaPost>().Property(e => e.PostId).ValueGeneratedNever();
        modelBuilder.Entity<SafehouseMonthlyMetric>().Property(e => e.MetricId).ValueGeneratedNever();
        modelBuilder.Entity<PublicImpactSnapshot>().Property(e => e.SnapshotId).ValueGeneratedNever();

        modelBuilder.Entity<Donation>()
            .HasOne<SocialMediaPost>()
            .WithMany()
            .HasForeignKey(d => d.ReferralPostId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
