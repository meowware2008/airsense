terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Single modest VM setup for college CDD project
resource "aws_key_pair" "airsense_deployer" {
  key_name   = "airsense-deployer-key"
  public_key = fileexists(var.ssh_public_key_path) ? file(var.ssh_public_key_path) : "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExamplePlaceholderKeyForTerraformValidation airsense@example"
}

resource "aws_security_group" "airsense_sg" {
  name        = "airsense-sg-${var.environment}"
  description = "Security group for AirSense single-VM host"

  # SSH
  ingress {
    description = "SSH access"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Flask Backend API
  ingress {
    description = "AirSense Backend REST API"
    from_port   = 5000
    to_port     = 5000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Grafana Dashboard
  ingress {
    description = "Grafana Operational Dashboard"
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound internet access for data ingestion
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "airsense-sg"
    Environment = var.environment
  }
}

# Ubuntu 22.04 LTS AMI lookup
data "aws_ami" "ubuntu" {
  most_recent = true
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  owners = ["099720109477"] # Canonical
}

resource "aws_instance" "airsense_host" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  key_name      = aws_key_pair.airsense_deployer.key_name

  vpc_security_group_ids = [aws_security_group.airsense_sg.id]

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  tags = {
    Name        = "airsense-${var.environment}-host"
    Project     = "AirSense"
    Environment = var.environment
  }
}
