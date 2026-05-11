resource "aws_ecr_repository" "backend_repo" {
  name                 = "spotify-youtube-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "spotify-youtube-backend"
  }
}

resource "aws_ecr_repository" "frontend_repo" {
  name                 = "spotify-youtube-frontend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "spotify-youtube-frontend"
  }
}

output "backend_repo_url" {
  value = aws_ecr_repository.backend_repo.repository_url
}

output "frontend_repo_url" {
  value = aws_ecr_repository.frontend_repo.repository_url
}

# Lifecycle policy to clean up old images (keep last 10)
resource "aws_ecr_lifecycle_policy" "backend_cleanup" {
  repository = aws_ecr_repository.backend_repo.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_ecr_lifecycle_policy" "frontend_cleanup" {
  repository = aws_ecr_repository.frontend_repo.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
