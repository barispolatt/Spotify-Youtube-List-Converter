# EC2's IAM Role
resource "aws_iam_role" "ec2_role" {
  name = "${var.environment}-ec2-role"

  # DÜZELTME: Statement bloğu dolduruldu
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement =
  })
}

# CodeDeploy Policy
resource "aws_iam_role_policy_attachment" "codedeploy_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2RoleforAWSCodeDeploy"
}

# S3 Access Policy for CodeDeploy Artifactleri
resource "aws_iam_role_policy_attachment" "s3_read_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

# SSM access Policy to read API Keys
resource "aws_iam_role_policy_attachment" "ssm_read_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Instance Profile
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.environment}-ec2-profile"
  role = aws_iam_role.ec2_role.name
}