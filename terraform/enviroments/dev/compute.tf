# Ubuntu 22.04 LTS AMI 
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical ID

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Generating SSH key (if there is not)
resource "aws_key_pair" "deployer" {
  key_name   = var.key_name
  public_key = file("~/.ssh/id_rsa.pub") # Public key route
}

# EC2 
resource "aws_instance" "app_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  key_name      = aws_key_pair.deployer.key_name

  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.k3s_sg.id]
  iam_instance_profile        = aws_iam_instance_profile.ec2_profile.name
  associate_public_ip_address = true

  root_block_device {
    volume_size = 20    # 20 GB 
    volume_type = "gp3" # General purpose SSD
    encrypted   = true
  }

  # Installation Script
  user_data = file("${path.module}/scripts/user_data.sh")
  
  # Re-create server if user_data changes
  user_data_replace_on_change = true 

  tags = {
    Name = "${var.environment}-k3s-node"
    Role = "k3s-master"
  }
}