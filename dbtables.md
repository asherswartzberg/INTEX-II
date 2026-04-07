/****** Object:  Database [free-sql-db-8222201]    Script Date: 2026-04-07 5:55:27 PM ******/
CREATE DATABASE [free-sql-db-8222201]  (EDITION = 'GeneralPurpose', SERVICE_OBJECTIVE = 'GP_S_Gen5_2', MAXSIZE = 32 GB) WITH CATALOG_COLLATION = SQL_Latin1_General_CP1_CI_AS, LEDGER = OFF;
GO
ALTER DATABASE [free-sql-db-8222201] SET COMPATIBILITY_LEVEL = 170
GO
ALTER DATABASE [free-sql-db-8222201] SET ANSI_NULL_DEFAULT OFF 
GO
ALTER DATABASE [free-sql-db-8222201] SET ANSI_NULLS OFF 
GO
ALTER DATABASE [free-sql-db-8222201] SET ANSI_PADDING OFF 
GO
ALTER DATABASE [free-sql-db-8222201] SET ANSI_WARNINGS OFF 
GO
ALTER DATABASE [free-sql-db-8222201] SET ARITHABORT OFF 
GO
ALTER DATABASE [free-sql-db-8222201] SET AUTO_SHRINK OFF 
GO
ALTER DATABASE [free-sql-db-8222201] SET AUTO_UPDATE_STATISTICS ON 
GO
ALTER DATABASE [free-sql-db-8222201] SET CURSOR_CLOSE_ON_COMMIT OFF 
GO
ALTER DATABASE [free-sql-db-8222201] SET CONCAT_NULL_YIELDS_NULL OFF 
GO
ALTER DATABASE [free-sql-db-8222201] SET NUMERIC_ROUNDABORT OFF 
GO
ALTER DATABASE [free-sql-db-8222201] SET QUOTED_IDENTIFIER OFF 
GO
ALTER DATABASE [free-sql-db-8222201] SET RECURSIVE_TRIGGERS OFF 
GO
ALTER DATABASE [free-sql-db-8222201] SET AUTO_UPDATE_STATISTICS_ASYNC OFF 
GO
ALTER DATABASE [free-sql-db-8222201] SET ALLOW_SNAPSHOT_ISOLATION ON 
GO
ALTER DATABASE [free-sql-db-8222201] SET PARAMETERIZATION SIMPLE 
GO
ALTER DATABASE [free-sql-db-8222201] SET READ_COMMITTED_SNAPSHOT ON 
GO
ALTER DATABASE [free-sql-db-8222201] SET  MULTI_USER 
GO
ALTER DATABASE [free-sql-db-8222201] SET AUTOMATIC_INDEX_COMPACTION = OFF 
GO
ALTER DATABASE [free-sql-db-8222201] SET ENCRYPTION ON
GO
ALTER DATABASE [free-sql-db-8222201] SET QUERY_STORE = ON
GO
ALTER DATABASE [free-sql-db-8222201] SET QUERY_STORE (OPERATION_MODE = READ_WRITE, CLEANUP_POLICY = (STALE_QUERY_THRESHOLD_DAYS = 30), DATA_FLUSH_INTERVAL_SECONDS = 900, INTERVAL_LENGTH_MINUTES = 60, MAX_STORAGE_SIZE_MB = 100, QUERY_CAPTURE_MODE = AUTO, SIZE_BASED_CLEANUP_MODE = AUTO, MAX_PLANS_PER_QUERY = 200, WAIT_STATS_CAPTURE_MODE = ON)
GO
/*** The scripts of database scoped configurations in Azure should be executed inside the target database connection. ***/
GO
-- ALTER DATABASE SCOPED CONFIGURATION SET MAXDOP = 8;
GO
/****** Object:  Table [dbo].[donation_allocations]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[donation_allocations](
	[allocation_id] [int] NOT NULL,
	[donation_id] [int] NOT NULL,
	[safehouse_id] [int] NOT NULL,
	[program_area] [nvarchar](50) NOT NULL,
	[amount_allocated] [float] NOT NULL,
	[allocation_date] [date] NOT NULL,
	[allocation_notes] [nvarchar](1) NULL,
 CONSTRAINT [PK_donation_allocations] PRIMARY KEY CLUSTERED 
(
	[allocation_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[donations]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[donations](
	[donation_id] [int] NOT NULL,
	[supporter_id] [int] NOT NULL,
	[donation_type] [nvarchar](50) NOT NULL,
	[donation_date] [date] NOT NULL,
	[is_recurring] [bit] NOT NULL,
	[campaign_name] [nvarchar](50) NULL,
	[channel_source] [nvarchar](50) NOT NULL,
	[currency_code] [nvarchar](50) NULL,
	[amount] [float] NULL,
	[estimated_value] [float] NOT NULL,
	[impact_unit] [nvarchar](50) NOT NULL,
	[notes] [nvarchar](50) NOT NULL,
	[referral_post_id] [int] NULL,
 CONSTRAINT [PK_donations] PRIMARY KEY CLUSTERED 
(
	[donation_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[donor_risk_scores]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[donor_risk_scores](
	[supporter_id] [bigint] NULL,
	[display_name] [varchar](max) NULL,
	[supporter_type] [varchar](max) NULL,
	[churn_risk_score] [float] NULL,
	[risk_label] [varchar](max) NULL,
	[recency_days] [bigint] NULL,
	[frequency] [bigint] NULL,
	[top_factors] [varchar](max) NULL,
	[prediction_timestamp] [varchar](max) NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[education_records]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[education_records](
	[education_record_id] [int] NOT NULL,
	[resident_id] [int] NOT NULL,
	[record_date] [date] NOT NULL,
	[education_level] [nvarchar](50) NOT NULL,
	[school_name] [nvarchar](50) NOT NULL,
	[enrollment_status] [nvarchar](50) NOT NULL,
	[attendance_rate] [float] NOT NULL,
	[progress_percent] [float] NOT NULL,
	[completion_status] [nvarchar](50) NOT NULL,
	[notes] [nvarchar](50) NOT NULL,
 CONSTRAINT [PK_education_records] PRIMARY KEY CLUSTERED 
(
	[education_record_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[health_wellbeing_records]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[health_wellbeing_records](
	[health_record_id] [int] NOT NULL,
	[resident_id] [int] NOT NULL,
	[record_date] [date] NOT NULL,
	[general_health_score] [float] NOT NULL,
	[nutrition_score] [float] NOT NULL,
	[sleep_quality_score] [float] NOT NULL,
	[energy_level_score] [float] NOT NULL,
	[height_cm] [float] NOT NULL,
	[weight_kg] [float] NOT NULL,
	[bmi] [float] NOT NULL,
	[medical_checkup_done] [bit] NOT NULL,
	[dental_checkup_done] [bit] NOT NULL,
	[psychological_checkup_done] [bit] NOT NULL,
	[notes] [nvarchar](50) NOT NULL,
 CONSTRAINT [PK_health_wellbeing_records] PRIMARY KEY CLUSTERED 
(
	[health_record_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[home_visitations]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[home_visitations](
	[visitation_id] [int] NOT NULL,
	[resident_id] [int] NOT NULL,
	[visit_date] [date] NOT NULL,
	[social_worker] [nvarchar](50) NOT NULL,
	[visit_type] [nvarchar](50) NOT NULL,
	[location_visited] [nvarchar](50) NOT NULL,
	[family_members_present] [nvarchar](50) NOT NULL,
	[purpose] [nvarchar](50) NOT NULL,
	[observations] [nvarchar](100) NOT NULL,
	[family_cooperation_level] [nvarchar](50) NOT NULL,
	[safety_concerns_noted] [bit] NOT NULL,
	[follow_up_needed] [bit] NOT NULL,
	[follow_up_notes] [nvarchar](50) NULL,
	[visit_outcome] [nvarchar](50) NOT NULL,
 CONSTRAINT [PK_home_visitations] PRIMARY KEY CLUSTERED 
(
	[visitation_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[in_kind_donation_items]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[in_kind_donation_items](
	[item_id] [int] NOT NULL,
	[donation_id] [int] NOT NULL,
	[item_name] [nvarchar](50) NOT NULL,
	[item_category] [nvarchar](50) NOT NULL,
	[quantity] [int] NOT NULL,
	[unit_of_measure] [nvarchar](50) NOT NULL,
	[estimated_unit_value] [float] NOT NULL,
	[intended_use] [nvarchar](50) NOT NULL,
	[received_condition] [nvarchar](50) NOT NULL,
 CONSTRAINT [PK_in_kind_donation_items] PRIMARY KEY CLUSTERED 
(
	[item_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[incident_reports]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[incident_reports](
	[incident_id] [int] NOT NULL,
	[resident_id] [int] NOT NULL,
	[safehouse_id] [int] NOT NULL,
	[incident_date] [date] NOT NULL,
	[incident_type] [nvarchar](50) NOT NULL,
	[severity] [nvarchar](50) NOT NULL,
	[description] [nvarchar](50) NOT NULL,
	[response_taken] [nvarchar](50) NOT NULL,
	[resolved] [bit] NOT NULL,
	[resolution_date] [date] NULL,
	[reported_by] [nvarchar](50) NOT NULL,
	[follow_up_required] [bit] NOT NULL,
 CONSTRAINT [PK_incident_reports] PRIMARY KEY CLUSTERED 
(
	[incident_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[intervention_plans]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[intervention_plans](
	[plan_id] [int] NOT NULL,
	[resident_id] [int] NOT NULL,
	[plan_category] [nvarchar](50) NOT NULL,
	[plan_description] [nvarchar](50) NOT NULL,
	[services_provided] [nvarchar](50) NOT NULL,
	[target_value] [float] NOT NULL,
	[target_date] [date] NOT NULL,
	[status] [nvarchar](50) NOT NULL,
	[case_conference_date] [date] NULL,
	[created_at] [datetime2](7) NOT NULL,
	[updated_at] [datetime2](7) NOT NULL,
 CONSTRAINT [PK_intervention_plans] PRIMARY KEY CLUSTERED 
(
	[plan_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[partner_assignments]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[partner_assignments](
	[assignment_id] [int] NOT NULL,
	[partner_id] [int] NOT NULL,
	[safehouse_id] [float] NULL,
	[program_area] [nvarchar](50) NOT NULL,
	[assignment_start] [date] NOT NULL,
	[assignment_end] [date] NULL,
	[responsibility_notes] [nvarchar](50) NOT NULL,
	[is_primary] [bit] NOT NULL,
	[status] [nvarchar](50) NOT NULL,
 CONSTRAINT [PK_partner_assignments] PRIMARY KEY CLUSTERED 
(
	[assignment_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[partners]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[partners](
	[partner_id] [int] NOT NULL,
	[partner_name] [nvarchar](50) NOT NULL,
	[partner_type] [nvarchar](50) NOT NULL,
	[role_type] [nvarchar](50) NOT NULL,
	[contact_name] [nvarchar](50) NOT NULL,
	[email] [nvarchar](50) NOT NULL,
	[phone] [nvarchar](50) NOT NULL,
	[region] [nvarchar](50) NOT NULL,
	[status] [nvarchar](50) NOT NULL,
	[start_date] [date] NOT NULL,
	[end_date] [date] NULL,
	[notes] [nvarchar](50) NOT NULL,
 CONSTRAINT [PK_partners] PRIMARY KEY CLUSTERED 
(
	[partner_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[process_recordings]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[process_recordings](
	[recording_id] [int] NOT NULL,
	[resident_id] [int] NOT NULL,
	[session_date] [date] NOT NULL,
	[social_worker] [nvarchar](50) NOT NULL,
	[session_type] [nvarchar](50) NOT NULL,
	[session_duration_minutes] [int] NOT NULL,
	[emotional_state_observed] [nvarchar](50) NOT NULL,
	[emotional_state_end] [nvarchar](50) NOT NULL,
	[session_narrative] [nvarchar](100) NOT NULL,
	[interventions_applied] [nvarchar](50) NOT NULL,
	[follow_up_actions] [nvarchar](50) NOT NULL,
	[progress_noted] [bit] NOT NULL,
	[concerns_flagged] [bit] NOT NULL,
	[referral_made] [bit] NOT NULL,
	[notes_restricted] [nvarchar](1) NULL,
 CONSTRAINT [PK_process_recordings] PRIMARY KEY CLUSTERED 
(
	[recording_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[public_impact_snapshots]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[public_impact_snapshots](
	[snapshot_id] [int] NOT NULL,
	[snapshot_date] [date] NOT NULL,
	[headline] [nvarchar](100) NOT NULL,
	[summary_text] [nvarchar](150) NOT NULL,
	[metric_payload_json] [nvarchar](150) NOT NULL,
	[is_published] [nvarchar](50) NOT NULL,
	[published_at] [date] NOT NULL,
 CONSTRAINT [PK_public_impact_snapshots] PRIMARY KEY CLUSTERED 
(
	[snapshot_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[resident_risk_scores]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[resident_risk_scores](
	[resident_id] [bigint] NULL,
	[incident_risk_score] [float] NULL,
	[risk_label] [varchar](max) NULL,
	[predicted_high_risk] [bigint] NULL,
	[top_factors] [varchar](max) NULL,
	[prediction_timestamp] [varchar](max) NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[residents]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[residents](
	[resident_id] [int] NOT NULL,
	[case_control_no] [nvarchar](50) NOT NULL,
	[internal_code] [nvarchar](50) NOT NULL,
	[safehouse_id] [int] NOT NULL,
	[case_status] [nvarchar](50) NOT NULL,
	[sex] [nvarchar](50) NOT NULL,
	[date_of_birth] [date] NOT NULL,
	[birth_status] [nvarchar](50) NOT NULL,
	[place_of_birth] [nvarchar](50) NOT NULL,
	[religion] [nvarchar](50) NOT NULL,
	[case_category] [nvarchar](50) NOT NULL,
	[sub_cat_orphaned] [bit] NOT NULL,
	[sub_cat_trafficked] [bit] NOT NULL,
	[sub_cat_child_labor] [bit] NOT NULL,
	[sub_cat_physical_abuse] [bit] NOT NULL,
	[sub_cat_sexual_abuse] [bit] NOT NULL,
	[sub_cat_osaec] [bit] NOT NULL,
	[sub_cat_cicl] [bit] NOT NULL,
	[sub_cat_at_risk] [bit] NOT NULL,
	[sub_cat_street_child] [bit] NOT NULL,
	[sub_cat_child_with_hiv] [bit] NOT NULL,
	[is_pwd] [bit] NOT NULL,
	[pwd_type] [nvarchar](50) NULL,
	[has_special_needs] [bit] NOT NULL,
	[special_needs_diagnosis] [nvarchar](50) NULL,
	[family_is_4ps] [bit] NOT NULL,
	[family_solo_parent] [bit] NOT NULL,
	[family_indigenous] [bit] NOT NULL,
	[family_parent_pwd] [bit] NOT NULL,
	[family_informal_settler] [bit] NOT NULL,
	[date_of_admission] [date] NOT NULL,
	[age_upon_admission] [nvarchar](50) NOT NULL,
	[present_age] [nvarchar](50) NOT NULL,
	[length_of_stay] [nvarchar](50) NOT NULL,
	[referral_source] [nvarchar](50) NOT NULL,
	[referring_agency_person] [nvarchar](50) NULL,
	[date_colb_registered] [date] NULL,
	[date_colb_obtained] [date] NULL,
	[assigned_social_worker] [nvarchar](50) NOT NULL,
	[initial_case_assessment] [nvarchar](50) NOT NULL,
	[date_case_study_prepared] [date] NULL,
	[reintegration_type] [nvarchar](50) NOT NULL,
	[reintegration_status] [nvarchar](50) NOT NULL,
	[initial_risk_level] [nvarchar](50) NOT NULL,
	[current_risk_level] [nvarchar](50) NOT NULL,
	[date_enrolled] [date] NOT NULL,
	[date_closed] [date] NULL,
	[created_at] [datetime2](7) NOT NULL,
	[notes_restricted] [nvarchar](1) NULL,
 CONSTRAINT [PK_residents] PRIMARY KEY CLUSTERED 
(
	[resident_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[safehouse_monthly_metrics]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[safehouse_monthly_metrics](
	[metric_id] [int] NOT NULL,
	[safehouse_id] [int] NOT NULL,
	[month_start] [date] NOT NULL,
	[month_end] [date] NOT NULL,
	[active_residents] [int] NOT NULL,
	[avg_education_progress] [float] NULL,
	[avg_health_score] [float] NULL,
	[process_recording_count] [int] NOT NULL,
	[home_visitation_count] [int] NOT NULL,
	[incident_count] [int] NOT NULL,
	[notes] [nvarchar](1) NULL,
 CONSTRAINT [PK_safehouse_monthly_metrics] PRIMARY KEY CLUSTERED 
(
	[metric_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[safehouses]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[safehouses](
	[safehouse_id] [int] NOT NULL,
	[safehouse_code] [nvarchar](50) NOT NULL,
	[name] [nvarchar](50) NOT NULL,
	[region] [nvarchar](50) NOT NULL,
	[city] [nvarchar](50) NOT NULL,
	[province] [nvarchar](50) NOT NULL,
	[country] [nvarchar](50) NOT NULL,
	[open_date] [date] NOT NULL,
	[status] [nvarchar](50) NOT NULL,
	[capacity_girls] [int] NOT NULL,
	[capacity_staff] [int] NOT NULL,
	[current_occupancy] [int] NOT NULL,
	[notes] [nvarchar](1) NULL,
 CONSTRAINT [PK_safehouses] PRIMARY KEY CLUSTERED 
(
	[safehouse_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[social_media_posts]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[social_media_posts](
	[post_id] [int] NOT NULL,
	[platform] [nvarchar](50) NOT NULL,
	[platform_post_id] [nvarchar](50) NOT NULL,
	[post_url] [nvarchar](100) NOT NULL,
	[created_at] [datetime2](7) NOT NULL,
	[day_of_week] [nvarchar](50) NOT NULL,
	[post_hour] [int] NOT NULL,
	[post_type] [nvarchar](50) NOT NULL,
	[media_type] [nvarchar](50) NOT NULL,
	[caption] [nvarchar](250) NOT NULL,
	[hashtags] [nvarchar](100) NULL,
	[num_hashtags] [int] NOT NULL,
	[mentions_count] [int] NOT NULL,
	[has_call_to_action] [bit] NOT NULL,
	[call_to_action_type] [nvarchar](50) NULL,
	[content_topic] [nvarchar](50) NOT NULL,
	[sentiment_tone] [nvarchar](50) NOT NULL,
	[caption_length] [int] NOT NULL,
	[features_resident_story] [bit] NOT NULL,
	[campaign_name] [nvarchar](50) NULL,
	[is_boosted] [bit] NOT NULL,
	[boost_budget_php] [float] NULL,
	[impressions] [int] NOT NULL,
	[reach] [int] NOT NULL,
	[likes] [int] NOT NULL,
	[comments] [int] NOT NULL,
	[shares] [int] NOT NULL,
	[saves] [int] NOT NULL,
	[click_throughs] [int] NOT NULL,
	[video_views] [float] NULL,
	[engagement_rate] [float] NOT NULL,
	[profile_visits] [int] NOT NULL,
	[donation_referrals] [int] NOT NULL,
	[estimated_donation_value_php] [float] NOT NULL,
	[follower_count_at_post] [int] NOT NULL,
	[watch_time_seconds] [float] NULL,
	[avg_view_duration_seconds] [float] NULL,
	[subscriber_count_at_post] [float] NULL,
	[forwards] [float] NULL,
 CONSTRAINT [PK_social_media_posts] PRIMARY KEY CLUSTERED 
(
	[post_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[social_media_recommendations]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[social_media_recommendations](
	[platform] [varchar](max) NULL,
	[post_type] [varchar](max) NULL,
	[media_type] [varchar](max) NULL,
	[content_topic] [varchar](max) NULL,
	[day_of_week] [varchar](max) NULL,
	[predicted_donation_referrals] [float] NULL,
	[predicted_engagement_rate] [float] NULL,
	[prediction_timestamp] [varchar](max) NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[supporters]    Script Date: 2026-04-07 5:55:28 PM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[supporters](
	[supporter_id] [int] NOT NULL,
	[supporter_type] [nvarchar](50) NOT NULL,
	[display_name] [nvarchar](50) NOT NULL,
	[organization_name] [nvarchar](50) NULL,
	[first_name] [nvarchar](50) NULL,
	[last_name] [nvarchar](50) NULL,
	[relationship_type] [nvarchar](50) NOT NULL,
	[region] [nvarchar](50) NOT NULL,
	[country] [nvarchar](50) NOT NULL,
	[email] [nvarchar](50) NOT NULL,
	[phone] [nvarchar](50) NOT NULL,
	[status] [nvarchar](50) NOT NULL,
	[created_at] [datetime2](7) NOT NULL,
	[first_donation_date] [date] NULL,
	[acquisition_channel] [nvarchar](50) NOT NULL,
 CONSTRAINT [PK_supporters] PRIMARY KEY CLUSTERED 
(
	[supporter_id] ASC
)WITH (STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER DATABASE [free-sql-db-8222201] SET  READ_WRITE 
GO
