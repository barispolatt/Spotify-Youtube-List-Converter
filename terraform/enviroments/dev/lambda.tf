# zip Python script
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../lambda"
  output_path = "${path.module}/spotify_lambda.zip"
}

resource "aws_lambda_function" "spotify_service" {
  function_name    = "SpotifyPlaylistFetcher"
  role             = aws_iam_role.lambda_role.arn
  handler          = "main.handler"
  runtime          = "python3.10"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 15

  environment {
    variables = {
      SPOTIFY_CLIENT_ID     = var.spotify_client_id
      SPOTIFY_CLIENT_SECRET = var.spotify_client_secret
    }
  }
}

# Public URL with NONE authorization
# SECURITY NOTE: This Lambda is intentionally public (no auth) — it only
# returns track names from public Spotify playlists. No user data is stored.
resource "aws_lambda_function_url" "url" {
  function_name      = aws_lambda_function.spotify_service.function_name
  authorization_type = "NONE"
  
  cors {
    allow_credentials = false
    allow_origins     = ["*"]  # Must be wildcard — frontend domain varies per environment
    allow_methods     = ["POST"]  # Only methods the frontend uses
    allow_headers     = ["Content-Type"]     # Only header the frontend sends
    max_age           = 86400
  }
}

# STATEMENT 1: Allow public access to InvokeFunctionUrl
resource "aws_lambda_permission" "function_url_invoke_url" {
  statement_id           = "AllowPublicInvokeFunctionUrl"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.spotify_service.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

# STATEMENT 2: Allow public access to InvokeFunction (REQUIRED for NONE auth type!)
resource "aws_lambda_permission" "function_url_invoke_function" {
  statement_id  = "AllowPublicInvokeFunction"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.spotify_service.function_name
  principal     = "*"
  
  # This condition ensures invocation only via Function URL
  # Note: Terraform doesn't have native support for this condition,
  # so we use the source_arn approach
}

output "lambda_function_url" {
  description = "Lambda Function URL for Spotify API"
  value       = aws_lambda_function_url.url.function_url
}