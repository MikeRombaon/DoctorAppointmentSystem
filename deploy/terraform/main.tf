terraform {
  required_version = ">= 1.6"
  required_providers {
	aws = {
	  source  = "hashicorp/aws"
	  version = "~> 5.0"
	}
  }

  # Uncomment to store state in S3 (recommended for teams)
  # backend "s3" {
  #   bucket = "mikromsolutions-terraform-state"
  #   key    = "das/terraform.tfstate"
  #   region = "ap-southeast-1"
  # }
}

provider "aws" {
  region = var.aws_region
  default_tags {
	tags = {
	  Project     = var.app_name
	  Environment = var.environment
	  ManagedBy   = "Terraform"
	}
  }
}

# ─── Data: look up existing HIS resources ─────────────────────────────────────
data "aws_vpc" "his" {
  id = var.his_vpc_id
}

# ─── ECR Repository ───────────────────────────────────────────────────────────
resource "aws_ecr_repository" "app" {
  name                 = "${var.app_name}-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
	scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name
  policy = jsonencode({
	rules = [{
	  rulePriority = 1
	  description  = "Keep last 5 images"
	  selection = {
		tagStatus   = "any"
		countType   = "imageCountMoreThan"
		countNumber = 5
	  }
	  action = { type = "expire" }
	}]
  })
}

# ─── Security Groups ──────────────────────────────────────────────────────────

# ALB — accepts HTTPS (443) and HTTP (80 → redirect) from the internet
resource "aws_security_group" "alb" {
  name        = "${var.app_name}-alb-sg"
  description = "DAS ALB security group"
  vpc_id      = var.his_vpc_id

  ingress {
	description = "HTTPS"
	from_port   = 443
	to_port     = 443
	protocol    = "tcp"
	cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
	description = "HTTP redirect"
	from_port   = 80
	to_port     = 80
	protocol    = "tcp"
	cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
	from_port   = 0
	to_port     = 0
	protocol    = "-1"
	cidr_blocks = ["0.0.0.0/0"]
  }
}

# ECS tasks — accepts traffic only from the ALB SG
resource "aws_security_group" "ecs_tasks" {
  name        = "${var.app_name}-ecs-sg"
  description = "DAS ECS tasks security group"
  vpc_id      = var.his_vpc_id

  ingress {
	description     = "From ALB"
	from_port       = var.container_port
	to_port         = var.container_port
	protocol        = "tcp"
	security_groups = [aws_security_group.alb.id]
  }

  egress {
	from_port   = 0
	to_port     = 0
	protocol    = "-1"
	cidr_blocks = ["0.0.0.0/0"]
  }
}

# RDS — accepts SQL Server traffic only from ECS tasks SG
resource "aws_security_group" "rds" {
  name        = "${var.app_name}-rds-sg"
  description = "DAS RDS SQL Server security group"
  vpc_id      = var.his_vpc_id

  ingress {
	description     = "SQL Server from ECS"
	from_port       = 1433
	to_port         = 1433
	protocol        = "tcp"
	security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
	from_port   = 0
	to_port     = 0
	protocol    = "-1"
	cidr_blocks = ["0.0.0.0/0"]
  }
}

# ─── RDS — SQL Server Express (separate from HIS) ─────────────────────────────
resource "aws_db_subnet_group" "das" {
  name       = "${var.app_name}-db-subnet-group"
  subnet_ids = var.his_private_subnet_ids
}

resource "aws_db_instance" "das" {
  identifier              = "${var.app_name}-sqlserver"
  engine                  = "sqlserver-ex"           # Express edition — no extra license cost
  engine_version          = "15.00.4395.2.v1"        # SQL Server 2019 Express
  instance_class          = var.db_instance_class    # db.t3.micro
  allocated_storage       = var.db_allocated_storage
  storage_type            = "gp2"
  license_model           = "license-included"

  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.das.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false   # ECS tasks in same VPC reach RDS directly
  multi_az               = var.db_multi_az

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.app_name}-final-snapshot"

  deletion_protection = true
}

# ─── ACM Certificate (must be in same region as ALB) ─────────────────────────
resource "aws_acm_certificate" "das" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
	create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
	for dvo in aws_acm_certificate.das.domain_validation_options : dvo.domain_name => {
	  name   = dvo.resource_record_name
	  record = dvo.resource_record_value
	  type   = dvo.resource_record_type
	}
  }

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "das" {
  certificate_arn         = aws_acm_certificate.das.arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# ─── Application Load Balancer ────────────────────────────────────────────────
resource "aws_lb" "das" {
  name               = "${var.app_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.his_public_subnet_ids
}

resource "aws_lb_target_group" "das" {
  name        = "${var.app_name}-tg"
  port        = var.container_port
  protocol    = "HTTP"
  vpc_id      = var.his_vpc_id
  target_type = "ip"   # required for Fargate

  health_check {
	enabled             = true
	path                = "/health"
	interval            = 30
	timeout             = 10
	healthy_threshold   = 2
	unhealthy_threshold = 3
	matcher             = "200"
  }
}

# HTTP → HTTPS redirect
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.das.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
	type = "redirect"
	redirect {
	  port        = "443"
	  protocol    = "HTTPS"
	  status_code = "HTTP_301"
	}
  }
}

# HTTPS listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.das.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.das.certificate_arn

  default_action {
	type             = "forward"
	target_group_arn = aws_lb_target_group.das.arn
  }
}

# ─── Route53 — A record → ALB ─────────────────────────────────────────────────
resource "aws_route53_record" "das" {
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
	name                   = aws_lb.das.dns_name
	zone_id                = aws_lb.das.zone_id
	evaluate_target_health = true
  }
}

# ─── IAM — ECS Task Execution Role ────────────────────────────────────────────
resource "aws_iam_role" "ecs_execution" {
  name = "${var.app_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
	Version = "2012-10-17"
	Statement = [{
	  Action    = "sts:AssumeRole"
	  Effect    = "Allow"
	  Principal = { Service = "ecs-tasks.amazonaws.com" }
	}]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow pulling secrets from SSM Parameter Store
resource "aws_iam_role_policy" "ecs_ssm" {
  name = "${var.app_name}-ecs-ssm-policy"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
	Version = "2012-10-17"
	Statement = [{
	  Effect   = "Allow"
	  Action   = ["ssm:GetParameters", "secretsmanager:GetSecretValue"]
	  Resource = "*"
	}]
  })
}

# IAM — ECS Task Role (app permissions)
resource "aws_iam_role" "ecs_task" {
  name = "${var.app_name}-ecs-task-role"

  assume_role_policy = jsonencode({
	Version = "2012-10-17"
	Statement = [{
	  Action    = "sts:AssumeRole"
	  Effect    = "Allow"
	  Principal = { Service = "ecs-tasks.amazonaws.com" }
	}]
  })
}

# ─── CloudWatch Log Group ─────────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "das" {
  name              = "/ecs/${var.app_name}"
  retention_in_days = 30
}

# ─── ECS Cluster ──────────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "das" {
  name = "${var.app_name}-cluster"

  setting {
	name  = "containerInsights"
	value = "enabled"
  }
}

# ─── ECS Task Definition ──────────────────────────────────────────────────────
locals {
  db_connection_string = "Server=${aws_db_instance.das.address},1433;Database=${var.db_name};User Id=${var.db_username};Password=${var.db_password};TrustServerCertificate=True;MultipleActiveResultSets=True;"
}

resource "aws_ecs_task_definition" "das" {
  family                   = "${var.app_name}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
	{
	  name      = "${var.app_name}-container"
	  image     = "${aws_ecr_repository.app.repository_url}:latest"
	  essential = true

	  portMappings = [
		{
		  containerPort = var.container_port
		  hostPort      = var.container_port
		  protocol      = "tcp"
		}
	  ]

	  environment = [
		{ name = "ASPNETCORE_ENVIRONMENT",                        value = "Production" },
		{ name = "ASPNETCORE_URLS",                               value = "http://+:${var.container_port}" },
		{ name = "ConnectionStrings__DefaultConnection",          value = local.db_connection_string },
		{ name = "Jwt__SecretKey",                                value = var.jwt_secret_key },
		{ name = "Cors__AllowedOrigins",                          value = "https://${var.domain_name}" },
		{ name = "Email__Provider",                               value = "Smtp" },
		{ name = "Email__Smtp__Host",                             value = var.smtp_host },
		{ name = "Email__Smtp__Port",                             value = var.smtp_port },
		{ name = "Email__Smtp__Username",                         value = var.smtp_username },
		{ name = "Email__Smtp__Password",                         value = var.smtp_password },
		{ name = "Email__Smtp__From",                             value = "noreply@mikromsolutions.com" }
	  ]

	  logConfiguration = {
		logDriver = "awslogs"
		options = {
		  "awslogs-group"         = aws_cloudwatch_log_group.das.name
		  "awslogs-region"        = var.aws_region
		  "awslogs-stream-prefix" = "ecs"
		}
	  }

	  healthCheck = {
		command     = ["CMD-SHELL", "wget -qO- http://localhost:${var.container_port}/health || exit 1"]
		interval    = 30
		timeout     = 5
		retries     = 3
		startPeriod = 90
	  }
	}
  ])
}

# ─── ECS Service ──────────────────────────────────────────────────────────────
resource "aws_ecs_service" "das" {
  name            = "${var.app_name}-service"
  cluster         = aws_ecs_cluster.das.id
  task_definition = aws_ecs_task_definition.das.arn
  desired_count   = var.ecs_desired_count
  launch_type     = "FARGATE"

  # Wait for the target group to have a healthy instance before considering deployment done
  health_check_grace_period_seconds = 120

  network_configuration {
	subnets          = var.his_private_subnet_ids
	security_groups  = [aws_security_group.ecs_tasks.id]
	assign_public_ip = true   # required — default VPC has no NAT gateway for private subnets
  }

  load_balancer {
	target_group_arn = aws_lb_target_group.das.arn
	container_name   = "${var.app_name}-container"
	container_port   = var.container_port
  }

  deployment_controller {
	type = "ECS"
  }

  deployment_circuit_breaker {
	enable   = true
	rollback = true
  }

  depends_on = [
	aws_lb_listener.https,
	aws_iam_role_policy_attachment.ecs_execution
  ]

  lifecycle {
	# Prevent Terraform from reverting image tag changes made by CI/CD
	ignore_changes = [task_definition]
  }
}
