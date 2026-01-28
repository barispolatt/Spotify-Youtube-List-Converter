# Bucket for CodeDeploy Artifacts
resource "aws_s3_bucket" "codedeploy_bucket" {
  bucket        = "spotify-converter-artifacts-${random_id.bucket_suffix.hex}"
  force_destroy = true
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Bucket for Frontend (React) (allowed Public Access - Static Hosting)
resource "aws_s3_bucket" "frontend_bucket" {
  bucket        = "spotify-converter-frontend-${random_id.bucket_suffix.hex}"
  force_destroy = true
}

resource "aws_s3_bucket_website_configuration" "frontend_hosting" {
  bucket = aws_s3_bucket.frontend_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend_public_access" {
  bucket = aws_s3_bucket.frontend_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Bucket Policy 
resource "aws_s3_bucket_policy" "frontend_policy" {
  bucket = aws_s3_bucket.frontend_bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement =
  })
  
  depends_on = [aws_s3_bucket_public_access_block.frontend_public_access]
}