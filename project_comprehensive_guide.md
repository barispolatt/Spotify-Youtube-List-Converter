# Spotify-YouTube List Converter: Comprehensive Project Report

## 1. Executive Summary
This document serves as a detailed technical record for the **Spotify-YouTube List Converter** project. It outlines the architectural decisions, the infrastructure-as-code implementation, the automation pipelines, and the significant engineering challenges overcome during development. The goal was to build a secure, automated, and scalable cloud-native application using modern DevOps practices.

## 2. Technical Architecture

### 2.1. Infrastructure (AWS + Terraform)
We utilized **Terraform** to provision a reproducible and modular infrastructure on AWS.
- **Compute**: `t3.micro` EC2 instance hosting a **K3s (Lightweight Kubernetes)** cluster.
- **Storage**:
  - **ECR (Elastic Container Registry)**: Stores Docker images for Frontend and Backend.
  - **S3 Buckets**: Stores Terraform state and application artifacts.
- **Serverless**: **AWS Lambda** (Python 3.10) handles Spotify API interactions to decouple external API logic from the main backend.
- **Networking**: VPC, Public Subnets, Internet Gateway, and Security Groups restricting access to SSH (22), HTTP (80), HTTPS (443), and K8s API (6443).
- **Security (IAM)**:
  - **EC2 Role**: Granular permissions for S3 access and ECR image pulling.
  - **Lambda Role**: Basic execution and logging permissions.

### 2.2. Application Stack
- **Frontend**: React (Vite) application served via Nginx. It communicates with the Lambda function and the Java Backend.
- **Backend**: Java Spring Boot application (Java 21) exposing REST APIs to search and convert tracks on YouTube.
- **Microservices Communication**:
  - Frontend -> Lambda (Fetch Spotify Playlist)
  - Frontend -> Backend (Search YouTube)

### 2.3. CI/CD Pipelines (GitHub Actions)
We implemented two parallel pipelines (`frontend-ci.yml`, `backend-ci.yml`) that trigger on pushes to `main`.
1.  **Build**:
    - Checkout code.
    - Set up Docker Buildx.
    - Login to AWS ECR.
    - Build Docker image with unique tag (Commit SHA).
    - Push image to ECR.
2.  **Prepare Manifests**:
    - **Local Variable Substitution**: The pipeline replaces placeholder strings (`REPLACE_ME_IMAGE_URL`) in Kubernetes manifests with the specific ECR image tag *before* sending files to the server. This ensures robust deployments.
3.  **Deploy**:
    - **SCP**: Securely copy prepared manifests to the EC2 instance.
    - **SSH**: Execute remote commands to apply `kubectl` configurations and restart deployments.

---

## 3. Implementation Journey & Challenges

### Phase 1: Infrastructure Provisioning
**Challenge 1: SSH Key Management**
- **Issue**: Terraform required a public key to inject into the EC2 instance. Configuring paths between local macOS and Terraform variables was tricky.
- **Solution**: We generated a dedicated key pair (`converter-project-key`) specifically for this project and configured Terraform to use the local public key file via `file()` interpolation.

**Challenge 2: Security Group Lockouts**
- **Issue**: Initially, we locked down SSH and K8s API access to a specific IP. When the user's IP changed or GitHub Actions tried to connect, access was denied.
- **Solution**: We temporarily opened SSH (0.0.0.0/0) to allow GitHub Actions to connect, with a roadmap item to restrict this later using VPN or Bastion hosts.

### Phase 2: Docker & ECR Integration
**Challenge 3: ECR Authentication on EC2**
- **Issue**: The K3s cluster on EC2 failed to pull images with `ImagePullBackOff` and `Access Denied`, even though the IAM Role had `AmazonEC2ContainerRegistryReadOnly`.
- **Root Cause**: Kubernetes does not automatically use the EC2 instance profile for registry authentication; it needs explicit Docker credentials.
- **Solution**:
  1. Installed **AWS CLI** on the server.
  2. Implemented a mechanism to generate an auth token (`aws ecr get-login-password`).
  3. Created a Kubernetes Secret (`regcred`) and patched the `default` ServiceAccount to use it automatically.

### Phase 3: CI/CD & Deployment Automation
**Challenge 4: Dynamic Image Tag Injection**
- **Issue**: We needed to update the Kubernetes deployment manifest with the new ECR image tag for every build. Initially, we tried running `sed` on the remote server via SSH, but it failed due to environment variable context issues (SSH shell didn't have the GitHub variables).
- **Solution**: **Local Substitution strategy**. We moved the `sed` text replacement step to the GitHub Runner (Local) side. We modify the file *inside the CI runner* and then upload the *finished* file to the server. This eliminated fragility.

**Challenge 5: Out of Memory (OOM) Crashes**
- **Issue**: The `t3.micro` instance (1GB RAM) crashed when trying to run K3s + Spring Boot + React + System processes.
- **Solution**: We implemented strict **Resource Limits** in Kubernetes manifests:
  - Frontend: Limited to 100Mi RAM.
  - Backend: Limited to 350Mi RAM.
  - This ensured the applications fit gracefully within the available hardware.

### Phase 4: Lambda Integration (The 403 Saga)
**Challenge 6: Lambda Function URL 403 Forbidden**
- **Issue**: The browser received `403 Forbidden` when calling the Lambda Function URL.
- **Investigation**:
  1. **CORS**: We relaxed CORS headers to `*` in Terraform.
  2. **Permissions**: We identified that `AuthType: NONE` (Public) still requires an explicit resource-based policy (`lambda:InvokeFunctionUrl` for Principal `*`).
  3. **State Corruption**: Despite applying the policy, 403 persisted. We attempted forcing permission recreation and even renaming the function (`SpotifyFetcherV2`) to bypass potential AWS internal state caching issues.
- **Current Status**: The Lambda infrastructure is deployed with the correct public configuration.

---

## 4. Key Decisions & "Why"

| Decision | Reason |
| :--- | :--- |
| **K3s (Kubernetes)** | Provides industry-standard container orchestration (Self-Healing, Rolling Updates) but is lightweight enough for a cheap EC2 instance. |
| **Terraform** | "Infrastructure as Code" allows us to destroy and recreate the entire environment in minutes, ensuring no configuration drift. |
| **Vite** | Chosen over Create-React-App for significantly faster build times and better local development experience. |
| **Separate Lambda** | Decouples the "Spotify API" logic. If the API rate limits or keys change, we update the Lambda without redeploying the main Monolith Backend. |
| **Mock Mode** | We implemented a "Mock Mode" in Lambda to allow development to proceed even without active Spotify API keys (which are currently restricted). |

## 5. Future Roadmap
1.  **Operational**: Rotate the `regcred` token automatically (ECR tokens expire in 12 hours). A cronjob on the server is the recommended fix.
2.  **Security**: Restrict SSH access to a VPN CIDR block.
3.  **Domain**: Map a custom domain (Route53) to the LoadBalancer/NodePort for a cleaner URL.
4.  **Monitoring**: Add Prometheus/Grafana to monitor the K3s cluster health.
