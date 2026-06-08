# DAS — AWS Deployment Guide
**URL:** https://das.mikromsolutions.com  
**Stack:** ECS Fargate · RDS SQL Server Express (db.t3.micro) · ALB + ACM · Route53  
**VPC/Subnets/SG:** reused from existing HIS environment

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| AWS CLI | ≥ 2.x | https://aws.amazon.com/cli/ |
| Terraform | ≥ 1.6 | https://terraform.io/downloads |
| Docker Desktop | ≥ 24 | https://docker.com |
| Git | any | https://git-scm.com |

---

## Step 1 — Gather HIS VPC details

You need the following IDs from the existing HIS AWS account:

```bash
# VPC
aws ec2 describe-vpcs --query "Vpcs[?Tags[?Key=='Name']|[?Value=='his-vpc']].VpcId"

# Public subnets (for ALB — need ≥ 2 AZs)
aws ec2 describe-subnets --filters "Name=vpc-id,Values=<VPC_ID>" \
  --query "Subnets[?MapPublicIpOnLaunch==\`true\`].[SubnetId,AvailabilityZone]"

# Private subnets (for ECS + RDS)
aws ec2 describe-subnets --filters "Name=vpc-id,Values=<VPC_ID>" \
  --query "Subnets[?MapPublicIpOnLaunch==\`false\`].[SubnetId,AvailabilityZone]"

# Security group
aws ec2 describe-security-groups --filters "Name=vpc-id,Values=<VPC_ID>" \
  --query "SecurityGroups[?GroupName=='his-app-sg'].[GroupId,GroupName]"

# Route53 zone ID for mikromsolutions.com
aws route53 list-hosted-zones \
  --query "HostedZones[?Name=='mikromsolutions.com.'].[Id,Name]"
```

---

## Step 2 — Configure Terraform variables

```bash
cd deploy/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars and fill in all values
```

Key values to fill:
- `his_vpc_id` — VPC from Step 1  
- `his_public_subnet_ids` — at least 2 public subnets  
- `his_private_subnet_ids` — at least 2 private subnets  
- `his_app_security_group_id` — HIS app SG  
- `route53_zone_id` — Route53 zone  
- `db_username` / `db_password` — RDS credentials  
- `jwt_secret_key` — minimum 32 characters, keep secret  

---

## Step 3 — Create AWS IAM user for CI/CD

```bash
# Create a deploy user with the minimum required policies
aws iam create-user --user-name das-deploy

aws iam attach-user-policy --user-name das-deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser

aws iam attach-user-policy --user-name das-deploy \
  --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess

# Create and note the access key
aws iam create-access-key --user-name das-deploy
```

Add to **GitHub → Repository → Settings → Secrets and variables → Actions**:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

---

## Step 4 — Provision infrastructure with Terraform

```bash
cd deploy/terraform

terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

> First run provisions: ECR, RDS, ALB, ACM cert, ECS cluster, Route53 A record.  
> ACM DNS validation can take 2–10 minutes.

Note the outputs:
```
ecr_repository_url  = 123456789.dkr.ecr.ap-southeast-1.amazonaws.com/das-api
rds_endpoint        = das-sqlserver.xxxxx.ap-southeast-1.rds.amazonaws.com
app_url             = https://das.mikromsolutions.com
ecs_cluster_name    = das-cluster
ecs_service_name    = das-service
```

---

## Step 5 — Run EF migrations against RDS

From a machine with network access to the RDS instance (or via an EC2 bastion):

```bash
# Set production connection string
$env:ConnectionStrings__DefaultConnection = "Server=<RDS_ENDPOINT>,1433;Database=DASProductionDB;User Id=<DB_USER>;Password=<DB_PASS>;TrustServerCertificate=True;"

cd C:\Code\DoctorAppointmentSystem
dotnet ef database update \
  --project DoctorAppointmentSystem.Data \
  --startup-project DoctorAppointmentSystem.API \
  --configuration Release
```

---

## Step 6 — First Docker build & push (manual, for initial deploy)

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region ap-southeast-1 | \
  docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-southeast-1.amazonaws.com

# Build and push
docker build -t das-api:latest .
docker tag das-api:latest <ECR_REPO_URL>:latest
docker push <ECR_REPO_URL>:latest
```

---

## Step 7 — Force ECS to pull the new image

```bash
aws ecs update-service \
  --cluster das-cluster \
  --service das-service \
  --force-new-deployment \
  --region ap-southeast-1
```

---

## Ongoing CI/CD

Every push to the **`main`** branch automatically:
1. Builds the Docker image  
2. Pushes to ECR (tagged with git SHA + `latest`)  
3. Updates the ECS task definition  
4. Triggers a rolling deployment  
5. Rolls back automatically if health checks fail  

Workflow file: `.github/workflows/deploy-aws.yml`

---

## Useful commands

```bash
# View live ECS logs
aws logs tail /ecs/das --follow --region ap-southeast-1

# Check running tasks
aws ecs list-tasks --cluster das-cluster --region ap-southeast-1

# Describe service health
aws ecs describe-services \
  --cluster das-cluster \
  --services das-service \
  --region ap-southeast-1 \
  --query "services[0].{Status:status,Running:runningCount,Desired:desiredCount,Events:events[0:3]}"

# Connect to RDS (requires SQL Server client or SSMS, and network access)
# Host: <rds_endpoint>   Port: 1433   DB: DASProductionDB
```

---

## Architecture diagram

```
Internet
   │
   ▼
Route53 (das.mikromsolutions.com)
   │  A record → ALB
   ▼
Application Load Balancer (ALB)
   │  HTTP → 301 HTTPS redirect
   │  HTTPS:443 → ACM certificate
   │  Forward → Target Group
   ▼
ECS Fargate Task (das-container :8080)
   │  .NET 10 API + React SPA (wwwroot)
   │  ENV vars for secrets
   ▼
RDS SQL Server Express (db.t3.micro)
   │  das-sqlserver.xxxxx.rds.amazonaws.com:1433
   │  Private subnet — no public access
   └─ Separate instance from HIS RDS
```

---

## Cost estimate (ap-southeast-1, single task)

| Resource | Config | Est. USD/month |
|----------|--------|---------------|
| ECS Fargate | 0.5 vCPU / 1 GB, ~730 hrs | ~$15 |
| RDS SQL Server Express | db.t3.micro, 20 GB | ~$15 |
| ALB | 1 ALB, low traffic | ~$18 |
| ECR | 5 images | ~$0.50 |
| Route53 | 1 hosted zone | $0.50 |
| **Total** | | **~$49/month** |

> RDS SQL Server Express is limited to 1 vCPU, 1 GB RAM, 10 GB database size.  
> Upgrade to `db.t3.small` + Standard edition when the database approaches 8 GB.
