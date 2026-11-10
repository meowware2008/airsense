variable "aws_region" {
  description = "AWS cloud region for AirSense host"
  type        = string
  default     = "ap-south-1"  # Mumbai region
}

variable "instance_type" {
  description = "EC2 instance size for the modest VM"
  type        = string
  default     = "t3.small"
}

variable "ssh_public_key_path" {
  description = "Local path to SSH public key for VM administration"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "production"
}
