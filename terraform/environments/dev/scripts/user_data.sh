#!/bin/bash
set -e

# save logs
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "Starting: System Update"
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget unzip ruby-full

# SWAP Configuration
# 1GB RAM is not enough, so we have to use 2GB of disk as RAM
echo "Swap field is creating..."
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# telling Linux to use Swap before RAM become full
sysctl vm.swappiness=20
echo 'vm.swappiness=20' >> /etc/sysctl.conf

# 2. Install AWS CLI v2
echo "Installing AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip
./aws/install
rm -rf aws awscliv2.zip

# 3. CodeDeploy agent installation
echo "CodeDeploy Agent installing..."
cd /home/ubuntu
wget https://aws-codedeploy-us-east-1.s3.us-east-1.amazonaws.com/latest/install
chmod +x ./install
./install auto
service codedeploy-agent start

# 4. K3s (Lite Kubernetes) installation
echo "K3s installing..."
# Traefik (Ingress Controller) and Metrics Server disabled:
# - Traefik is not needed on a single-node cluster using NodePort services.
#   Traffic access control is enforced via AWS Security Groups instead.
#   Re-enable if you need TLS termination or path-based routing in-cluster.
# - Metrics Server disabled to save memory on t3a.small (2 GiB RAM).
# K3S_KUBECONFIG_MODE="644": to use kubectl without sudo
curl -sfL https://get.k3s.io | K3S_KUBECONFIG_MODE="644" sh -s - server \
  --disable traefik \
  --disable metrics-server \
  --node-name k3s-master

# wait for K3s (poll until node is Ready, timeout after 120s)
echo "Waiting for K3s to be ready..."
SECONDS=0
until k3s kubectl get nodes 2>/dev/null | grep -q " Ready"; do
  if [ $SECONDS -ge 120 ]; then
    echo "ERROR: K3s did not become ready within 120 seconds"
    exit 1
  fi
  echo "  K3s not ready yet... (${SECONDS}s elapsed)"
  sleep 5
done
echo "K3s is ready (took ${SECONDS}s)"

# set default kubeconfig file for ubuntu user
mkdir -p /home/ubuntu/.kube
cp /etc/rancher/k3s/k3s.yaml /home/ubuntu/.kube/config
chown ubuntu:ubuntu /home/ubuntu/.kube/config
chmod 600 /home/ubuntu/.kube/config

# 5. Install Helm 3
echo "Installing Helm 3..."
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
echo "Helm version: $(helm version --short)"

echo "Define alias for K3s"
echo "alias k=kubectl" >> /home/ubuntu/.bashrc

# 6. Configure ECR credentials for K3s
echo "Configuring ECR credentials..."

# Get AWS account ID and region from instance metadata
TOKEN=$(curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
AWS_REGION=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/placement/region)
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create ECR Docker registry secret
ECR_PASSWORD=$(aws ecr get-login-password --region $AWS_REGION)
k3s kubectl create secret docker-registry regcred \
  --docker-server=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com \
  --docker-username=AWS \
  --docker-password=${ECR_PASSWORD} \
  --dry-run=client -o yaml | k3s kubectl apply -f -

# Patch default service account to use the ECR secret
k3s kubectl patch serviceaccount default -p '{"imagePullSecrets": [{"name": "regcred"}]}'

# 7. Create cron job to refresh ECR token (expires every 12 hours)
echo "Setting up ECR token refresh cron job..."
cat > /opt/refresh-ecr-token.sh << 'REFRESH_SCRIPT'
#!/bin/bash
AWS_REGION=$(curl -s -H "X-aws-ec2-metadata-token: $(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")" http://169.254.169.254/latest/meta-data/placement/region)
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_PASSWORD=$(aws ecr get-login-password --region $AWS_REGION)
k3s kubectl create secret docker-registry regcred \
  --docker-server=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com \
  --docker-username=AWS \
  --docker-password=${ECR_PASSWORD} \
  --dry-run=client -o yaml | k3s kubectl apply -f -
REFRESH_SCRIPT

# Script owned by root, only root can modify/execute — prevents privilege escalation
chmod 700 /opt/refresh-ecr-token.sh
chown root:root /opt/refresh-ecr-token.sh

# Run every 10 hours to refresh before 12-hour expiry (root's crontab)
echo "0 */10 * * * /opt/refresh-ecr-token.sh >> /var/log/ecr-refresh.log 2>&1" | crontab -

echo "Installation complete!"