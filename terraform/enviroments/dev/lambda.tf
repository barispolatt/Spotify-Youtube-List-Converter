# zip python code 
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../../../lambda" # Doğru yol (3 klasör yukarıda)
  output_path = "${path.module}/spotify_lambda.zip"
}

resource "aws_lambda_function" "spotify_service" {
  function_name = "SpotifyFetcher"
  role          = aws_iam_role.lambda_role.arn
  handler       = "main.handler"
  runtime       = "python3.10"
  filename      = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout       = 15

  # API Keys
  environment {
    variables = {
      SPOTIFY_CLIENT_ID     = "CHANGE_ME_IN_CONSOLE"
      SPOTIFY_CLIENT_SECRET = "CHANGE_ME_IN_CONSOLE"
    }
  }
}

# Public URL to avoid API Gateway prices
resource "aws_lambda_function_url" "url" {
  function_name      = aws_lambda_function.spotify_service.function_name
  authorization_type = "NONE"
  cors {
    allow_origins = ["*"]
    allow_methods =
  }
}