variable "aws_region" {
  description = "AWS regions that sources will be created"
  type        = string
  default     = "us-east-1" # Cheapest
}

variable "environment" {
  description = "Enviroment name (dev, prod, staging)"
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

variable "my_ip" {
  description = "Your personal IP address for SSH/API access (CIDR format, e.g. 1.2.3.4/32)"
  type        = string
}

variable "spotify_client_id" {
  description = "Spotify Client ID for API access"
  type        = string
  sensitive   = true
}

variable "spotify_client_secret" {
  description = "Spotify Client Secret for API access"
  type        = string
  sensitive   = true
}