# Creating VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true # Required for DNS resolution.
  enable_dns_hostnames = true # Gives public DNS name to EC2

  tags = {
    Name = "${var.environment}-main-vpc"
  }
}

# Internet Gateway 
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.environment}-igw"
  }
}

# Public Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  map_public_ip_on_launch = true # give IP automatically to the servers opened in this network
  availability_zone       = "${var.aws_region}a" # us-east-1a

  tags = {
    Name = "${var.environment}-public-subnet"
  }
}

# Route Table
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main.id

  # Send all internet traffic to (0.0.0.0/0) Gateway
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "${var.environment}-public-rt"
  }
}

# Associating Route Tables with Subnets
resource "aws_route_table_association" "public_assoc" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public_rt.id
}