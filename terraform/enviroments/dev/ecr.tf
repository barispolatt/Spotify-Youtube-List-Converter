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
