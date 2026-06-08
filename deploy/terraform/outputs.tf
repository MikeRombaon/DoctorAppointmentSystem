output "ecr_repository_url" {
  description = "ECR repository URL — use this as the IMAGE in your CI/CD pipeline"
  value       = aws_ecr_repository.app.repository_url
}

output "alb_dns_name" {
  description = "ALB DNS name (set as CNAME source if not using Route53)"
  value       = aws_lb.das.dns_name
}

output "app_url" {
  description = "Public application URL"
  value       = "https://${var.domain_name}"
}

output "rds_endpoint" {
  description = "RDS instance endpoint (host only, no port)"
  value       = aws_db_instance.das.address
  sensitive   = false
}

output "rds_port" {
  description = "RDS SQL Server port"
  value       = aws_db_instance.das.port
}

output "ecs_cluster_name" {
  description = "ECS cluster name (used in CI/CD deploy step)"
  value       = aws_ecs_cluster.das.name
}

output "ecs_service_name" {
  description = "ECS service name (used in CI/CD deploy step)"
  value       = aws_ecs_service.das.name
}

output "cloudwatch_log_group" {
  description = "CloudWatch log group for ECS container logs"
  value       = aws_cloudwatch_log_group.das.name
}

output "acm_certificate_arn" {
  description = "ACM certificate ARN"
  value       = aws_acm_certificate.das.arn
}
