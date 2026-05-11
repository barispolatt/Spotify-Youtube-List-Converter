resource "aws_security_group" "k3s_sg" {
  name        = "${var.environment}-k3s-sg"
  description = "K3s Node Security Group hardened for production"
  vpc_id      = aws_vpc.main.id

  # SSH Access
  # SECURITY: Open to 0.0.0.0/0 because GitHub Actions uses dynamic IPs.
  # Mitigated by: SSH key authentication only (no password), non-root user.
  # TODO: For maximum security, replace SSH with AWS SSM Session Manager
  #       and remove this rule entirely.
  ingress {
    description = "SSH Access (GitHub Actions + admin)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP Access (frontend via NodePort 30081 or direct)
  ingress {
    description = "HTTP Access"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS Access
  ingress {
    description = "HTTPS Access"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Kubernetes API Access (for kubectl command)
  ingress {
    description = "K3s API Server"
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = [var.my_ip]
  }

  # SECURITY FIX: Only expose the specific NodePorts we actually use,
  # instead of the entire 30000-32767 range. This prevents accidental
  # exposure of any future services.
  ingress {
    description = "Backend API (NodePort)"
    from_port   = 30080
    to_port     = 30080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Frontend (NodePort)"
    from_port   = 30081
    to_port     = 30081
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Egress - everywhere (needed for ECR pulls, yt-dlp, system updates)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.environment}-k3s-sg"
  }
}