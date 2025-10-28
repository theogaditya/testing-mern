pipeline {
  agent { label 'worker-testing-mern' }

  environment {
    DOCKERHUB_CREDENTIALS = 'testing-mern-docker'
    BACKEND_IMAGE = 'ogadityahota/testing-mern-backend'
    WORKER_IMAGE  = 'ogadityahota/testing-mern-worker'
  }

  options {
    timestamps()
    ansiColor('xterm')
    buildDiscarder(logRotator(numToKeepStr: '50'))
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        sh 'git rev-parse --short HEAD || true'
      }
    }

    stage('Install deps (root)') {
      steps {
        echo 'No global install. Installing per-project later.'
      }
    }

    stage('Run unit tests - new-be') {
      steps {
        dir('new-be') {
          sh '''
            export PATH="$HOME/.bun/bin:$PATH"
            bun install --ignore-scripts || true
            npx prisma generate
            npx vitest test/unit.test.ts --run
          '''
        }
      }
    }

    stage('Run tests - worker (requires redis)') {
      steps {
        script {
          sh 'docker run -d --name ci-redis -p 6379:6379 redis:7-alpine'
        }
        dir('worker') {
          sh '''
            export PATH="$HOME/.bun/bin:$PATH"
            bun install --ignore-scripts || true
            npx vitest test/ws.test.ts --run
          '''
        }
      }
      post {
        always {
          sh 'docker rm -f ci-redis || true'
        }
      }
    }

    stage('Build Docker images') {
      steps {
        script {
          dir('new-be') {
            sh "docker build -t ${env.BACKEND_IMAGE}:latest -f Dockerfile ."
          }
          dir('worker') {
            sh "docker build -t ${env.WORKER_IMAGE}:latest -f Dockerfile ."
          }
        }
      }
    }

    stage('Push images to Docker Hub') {
      steps {
        withCredentials([usernamePassword(credentialsId: env.DOCKERHUB_CREDENTIALS, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh '''
            echo $DOCKER_PASS | docker login -u "$DOCKER_USER" --password-stdin
            docker push ${BACKEND_IMAGE}:latest
            docker push ${WORKER_IMAGE}:latest
          '''
        }
      }
    }
  }

  post {
    success {
      script {
        env.ARGOCD_SERVER = 'a794d5cd94aee45dfb7c88d33ef442b3-198542243.us-east-2.elb.amazonaws.com'
        env.ARGOCD_APP = 'wanderlust'
      }

      withCredentials([usernamePassword(credentialsId: 'argocd-login', usernameVariable: 'ARGO_USER', passwordVariable: 'ARGO_PASS')]) {
        sh '''
          set -e
          echo "Requesting ArgoCD token..."
          TOKEN=$(curl -s -k -H "Content-Type: application/json" -d '{"username":"'"$ARGO_USER"'","password":"'"$ARGO_PASS"'"}' https://${ARGOCD_SERVER}/api/v1/session \
                  | python3 -c "import sys, json; print(json.load(sys.stdin).get('token',''))")

          if [ -z "$TOKEN" ]; then
            echo "ERROR: Unable to get ArgoCD token"; exit 1
          fi

          echo "Triggering ArgoCD sync for app: ${ARGOCD_APP}"
          curl -s -k -H "Authorization: Bearer ${TOKEN}" -X POST \
            https://${ARGOCD_SERVER}/api/v1/applications/${ARGOCD_APP}/sync \
            -H "Content-Type: application/json" \
            -d '{"prune": true, "dryRun": false}'
          echo "✅ ArgoCD sync requested successfully."
        '''
      }
    }

    failure {
      echo "❌ CI pipeline failed. ArgoCD sync skipped."
