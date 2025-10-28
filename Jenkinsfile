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
          sh 'bun run test:unit'
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
          sh 'bun run test'
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
      echo "CI pipeline finished and images pushed as ${env.BUILD_TAG}"
    }
    failure {
      echo "CI pipeline failed"
    }
    always {
      // make sure no leftover redis
      sh 'docker rm -f ci-redis || true'
    }
  }
}
