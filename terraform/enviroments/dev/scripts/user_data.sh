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
echo "Swap alanı oluşturuluyor..."
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# telling Linux to use Swap before RAM become full
sysctl vm.swappiness=20
echo 'vm.swappiness=20' >> /etc/sysctl.conf

# 2. CodeDeploy agent installation
echo "CodeDeploy Agent installing..."
cd /home/ubuntu
wget https://aws-codedeploy-us-east-1.s3.us-east-1.amazonaws.com/latest/install
chmod +x./install
./install auto
service codedeploy-agent start

# 3. K3s (Lite Kubernetes) installation
echo "K3s installing..."
# Traefik (Ingress Controller) and Metrics Server closing
# K3S_KUBECONFIG_MODE="644": to use kubectl without sudo
curl -sfL https://get.k3s.io | K3S_KUBECONFIG_MODE="644" sh -s - server \
  --disable traefik \
  --disable metrics-server \
  --node-name k3s-master

# wait for K3s
sleep 30

# set default kubeconfig file for ubuntu user
mkdir -p /home/ubuntu/.kube
cp /etc/rancher/k3s/k3s.yaml /home/ubuntu/.kube/config
chown ubuntu:ubuntu /home/ubuntu/.kube/config
chmod 600 /home/ubuntu/.kube/config

echo "Define alias for K3s"
echo "alias k=kubectl" >> /home/ubuntu/.bashrc

echo "Installation complete!"