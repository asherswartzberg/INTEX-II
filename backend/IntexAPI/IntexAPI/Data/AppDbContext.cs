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
        modelBuilder.Entity<Donation>()
            .HasOne<SocialMediaPost>()
            .WithMany()
            .HasForeignKey(d => d.ReferralPostId)
            .OnDelete(DeleteBehavior.NoAction);
    }
}
