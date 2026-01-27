variable "aws_region" {
  description = "AWS regions that sources will be created"
  type        = string
  default     = "us-east-1" # Cheapest
}

variable "environment" {
  description = "Ortam name (dev, prod, staging)"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "IP block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "Public Subnet IP block"
  type        = string
  default     = "10.0.1.0/24"
}

variable "instance_type" {
  description = "EC2 server type (t2.micro or t3.micro for Free Tier)"
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Key name to connect server with SSH"
  type        = string
  default     = "converter-project-key"
}