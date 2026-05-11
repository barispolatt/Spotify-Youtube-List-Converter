resource "aws_ssm_parameter" "spotify_client_id" {
  name        = "/${var.environment}/spotify/client_id"
  description = "Spotify App Client ID"
  type        = "String"
  value       = "CHANGE_ME" # initial value
  
  lifecycle {
    ignore_changes = [value] # Terraform dont change this value later
  }
}

resource "aws_ssm_parameter" "spotify_client_secret" {
  name        = "/${var.environment}/spotify/client_secret"
  description = "Spotify App Client Secret"
  type        = "SecureString" # encrypted string
  value       = "CHANGE_ME"

  lifecycle {
    ignore_changes = [value]
  }
}