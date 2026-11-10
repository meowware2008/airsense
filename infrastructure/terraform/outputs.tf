output "instance_public_ip" {
  description = "Public IP address of the provisioned AirSense host"
  value       = aws_instance.airsense_host.public_ip
}

output "instance_id" {
  description = "EC2 Instance ID"
  value       = aws_instance.airsense_host.id
}

output "api_endpoint" {
  description = "Direct URL to AirSense Backend API"
  value       = "http://${aws_instance.airsense_host.public_ip}:5000"
}

output "grafana_endpoint" {
  description = "Direct URL to Grafana Operational Dashboard"
  value       = "http://${aws_instance.airsense_host.public_ip}:3001"
}
