using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace IntexAPI.Data;

[Table("education_records")]
public class EducationRecord
{
    [Key]
    [Column("education_record_id")]
    public int EducationRecordId { get; set; }

    [Column("resident_id")]
    public int? ResidentId { get; set; }

    [Column("record_date")]
    public DateOnly? RecordDate { get; set; }

    [Column("education_level")]
    [MaxLength(64)]
    public string? EducationLevel { get; set; }

    [Column("school_name")]
    [MaxLength(256)]
    public string? SchoolName { get; set; }

    [Column("enrollment_status")]
    [MaxLength(64)]
    public string? EnrollmentStatus { get; set; }

    [Column("attendance_rate")]
    public decimal? AttendanceRate { get; set; }

    [Column("progress_percent")]
    public decimal? ProgressPercent { get; set; }

    [Column("completion_status")]
    [MaxLength(64)]
    public string? CompletionStatus { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }
}
