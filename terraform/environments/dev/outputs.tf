output "ec2_public_ip" {
  value = aws_instance.app_server.public_ip
}

output "lambda_url" {
  value = aws_lambda_function_url.url.function_url
}