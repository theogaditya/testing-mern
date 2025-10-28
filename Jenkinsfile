pipeline {
  agent { label 'worker-testing-mern' }

  environment {
    DOCKERHUB_CREDENTIALS = 'testing-mern-docker'
    BACKEND_IMAGE = 'ogadityahota/testing-mern-backend'
    WORKER_IMAGE  = 'ogadityahota/testing-mern-worker'
    BUILD_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'local'}"
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
          sh 'bun install --ignore-scripts || true'
          sh 'npx prisma generate'
          sh 'npx vitest test/unit.test.ts --run'
        }
      }
    }

    stage('Run tests - worker (requires redis)') {
      steps {
        script {
          // start a local redis for tests (detached)
          sh 'docker run -d --name ci-redis -p 6379:6379 redis:7-alpine'
        }
        dir('worker') {
          sh 'bun install --ignore-scripts || true'
          sh 'npx vitest test/ws.test.ts --run'
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
          // build backend
          dir('new-be') {
            sh "docker build -t ${env.BACKEND_IMAGE}:${env.BUILD_TAG} -f Dockerfile ."
          }
          // build worker
          dir('worker') {
            sh "docker build -t ${env.WORKER_IMAGE}:${env.BUILD_TAG} -f Dockerfile ."
          }
        }
      }
    }

    stage('Push images to Docker Hub') {
      steps {
        withCredentials([usernamePassword(credentialsId: env.DOCKERHUB_CREDENTIALS, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh 'echo $DOCKER_PASS | docker login -u "$DOCKER_USER" --password-stdin'
          sh "docker push ${env.BACKEND_IMAGE}:${env.BUILD_TAG}"
          sh "docker push ${env.WORKER_IMAGE}:${env.BUILD_TAG}"
          // optionally push :latest tag
          sh "docker tag ${env.BACKEND_IMAGE}:${env.BUILD_TAG} ${env.BACKEND_IMAGE}:latest || true"
          sh "docker tag ${env.WORKER_IMAGE}:${env.BUILD_TAG} ${env.WORKER_IMAGE}:latest || true"
          sh "docker push ${env.BACKEND_IMAGE}:latest || true"
          sh "docker push ${env.WORKER_IMAGE}:latest || true"
        }
      }
    }
  }

  post {
  success {
    script {
      // --- configure these variables as environment variables earlier in Jenkinsfile or hardcode here ---
      env.ARGOCD_SERVER = 'a794d5cd94aee45dfb7c88d33ef442b3-198542243.us-east-2.elb.amazonaws.com' // your external argocd endpoint (no https://)
      env.ARGOCD_APP = 'wanderlust' 
    }

    // Use the stored username/password (argocd admin). Create credential id 'argocd-login' in Jenkins.
    withCredentials([usernamePassword(credentialsId: 'argocd-login', usernameVariable: 'ARGO_USER', passwordVariable: 'ARGO_PASS')]) {
      sh '''
        set -e
        echo "Requesting ArgoCD token..."
        # get JWT token using ArgoCD session API
        TOKEN=$(curl -s -k -H "Content-Type: application/json" -d '{"username":"'"$ARGO_USER"'","password":"'"$ARGO_PASS"'"}' https://${ARGOCD_SERVER}/api/v1/session \
                | python3 -c "import sys, json; print(json.load(sys.stdin).get('token',''))")

        if [ -z "$TOKEN" ]; then
          echo "ERROR: unable to get ArgoCD token"; exit 1
        fi

        echo "Triggering ArgoCD sync for app: ${ARGOCD_APP}"
        # POST to sync endpoint. This requests a normal sync (ArgoCD will do its automated sync/rollout)
        curl -s -k -H "Authorization: Bearer ${TOKEN}" -X POST \
          https://${ARGOCD_SERVER}/api/v1/applications/${ARGOCD_APP}/sync \
          -H "Content-Type: application/json" \
          -d '{"prune": true, "dryRun": false}' \
          | python3 -m json.tool

        echo "ArgoCD sync requested."
      '''
    }
  }
}

}
