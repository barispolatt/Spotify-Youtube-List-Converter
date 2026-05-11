provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "SpotifyYoutubeConverter"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "OpenSourceContributor"
    }
  }
}