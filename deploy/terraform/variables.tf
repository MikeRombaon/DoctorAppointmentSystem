# ─── AWS Region ───────────────────────────────────────────────────────────────
variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-southeast-1"
}

# ─── Naming ───────────────────────────────────────────────────────────────────
variable "app_name" {
  description = "Short application name used to prefix all resources"
  type        = string
  default     = "das"
}

variable "environment" {
  description = "Deployment environment tag (production / staging)"
  type        = string
  default     = "production"
}

# ─── Domain ───────────────────────────────────────────────────────────────────
variable "domain_name" {
  description = "Full public domain for the application"
  type        = string
  default     = "das.mikromsolutions.com"
}

variable "route53_zone_id" {
  description = "Route53 Hosted Zone ID for mikromsolutions.com"
  type        = string
  # Find with: aws route53 list-hosted-zones --query "HostedZones[?Name=='mikromsolutions.com.']"
}

# ─── Existing HIS VPC / Networking (reused) ───────────────────────────────────
variable "his_vpc_id" {
  description = "VPC ID from the HIS environment to reuse"
  type        = string
}

variable "his_public_subnet_ids" {
  description = "List of public subnet IDs (at least 2 AZs) for the ALB"
  type        = list(string)
}

variable "his_private_subnet_ids" {
  description = "List of private subnet IDs (at least 2 AZs) for ECS tasks and RDS"
  type        = list(string)
}

variable "his_app_security_group_id" {
  description = "Security group ID used by HIS application tier (for ALB → app SG rules)"
  type        = string
}

# ─── Container ────────────────────────────────────────────────────────────────
variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 8080
}

variable "ecs_task_cpu" {
  description = "ECS task CPU units (256 = 0.25 vCPU)"
  type        = number
  default     = 512
}

variable "ecs_task_memory" {
  description = "ECS task memory in MiB"
  type        = number
  default     = 1024
}

variable "ecs_desired_count" {
  description = "Desired number of ECS task instances"
  type        = number
  default     = 1
}

# ─── RDS — SQL Server Express t3.micro ────────────────────────────────────────
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "SQL Server database name"
  type        = string
  default     = "DASProductionDB"
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "RDS master password (min 8 chars, no @/\"/space)"
  type        = string
  sensitive   = true
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_multi_az" {
  description = "Enable Multi-AZ for RDS (adds cost — leave false for t3.micro free tier)"
  type        = bool
  default     = false
}

# ─── Application Secrets ──────────────────────────────────────────────────────
variable "jwt_secret_key" {
  description = "JWT signing secret — minimum 32 characters"
  type        = string
  sensitive   = true
}

variable "smtp_host" {
  description = "SMTP host for email"
  type        = string
  default     = ""
}

variable "smtp_port" {
  description = "SMTP port"
  type        = string
  default     = "587"
}

variable "smtp_username" {
  description = "SMTP username"
  type        = string
  default     = ""
  sensitive   = true
}

variable "smtp_password" {
  description = "SMTP password / app password"
  type        = string
  default     = ""
  sensitive   = true
}

# ─── DAS-specific pre-created Security Groups (informational / reference) ─────
variable "das_alb_security_group_id" {
  description = "Pre-existing DAS ALB security group ID (informational reference)"
  type        = string
  default     = ""
}

variable "das_rds_security_group_id" {
  description = "Pre-existing DAS RDS security group ID (informational reference)"
  type        = string
  default     = ""
}
