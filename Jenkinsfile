pipeline {
  agent { label 'agent-testing-mern' }

  environment {
    DOCKERHUB_CREDENTIALS = 'testing-mern-docker'
    BACKEND_IMAGE = 'ogadityahota/testing-mern-backend'
    WORKER_IMAGE  = 'ogadityahota/testing-mern-worker'
    CI_NET = 'ci-net-testing-mern'
    REDIS_NAME = 'ci-redis-testing-mern'
    REDIS_IMAGE = 'redis:7-alpine'
    IMAGE_TAG = "${env.BUILD_NUMBER ?: 'local'}"
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Start Redis for tests') {
      steps {
        sh '''
          docker network inspect ${CI_NET} >/dev/null 2>&1 || docker network create ${CI_NET}
          docker rm -f ${REDIS_NAME} >/dev/null 2>&1 || true
          docker run -d --name ${REDIS_NAME} --network ${CI_NET} ${REDIS_IMAGE}
          # wait for redis
          for i in $(seq 1 10); do
            docker exec ${REDIS_NAME} redis-cli ping | grep -q PONG && break || sleep 1
          done
        '''
      }
    }

    stage('Backend: unit tests') {
      steps {
        dir('new-be') {
          sh '''
            docker run --rm -v "$PWD":/work -w /work --network ${CI_NET} oven/bun:latest bash -lc '
              bun install --no-save
              bun run test:unit
            '
          '''
        }
      }
    }

    stage('Worker: tests') {
      steps {
        dir('worker') {
          sh '''
            docker run --rm -v "$PWD":/work -w /work --network ${CI_NET} -e REDIS_URL="redis://${REDIS_NAME}:6379" oven/bun:latest bash -lc '
              bun install --no-save
              REDIS_URL="redis://${REDIS_NAME}:6379" bun run test
            '
          '''
        }
      }
    }

    stage('Build & Push images') {
      steps {
        withCredentials([usernamePassword(credentialsId: env.DOCKERHUB_CREDENTIALS, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh '''
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

            # build & push backend
            cd new-be
            docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} .
            docker push ${BACKEND_IMAGE}:${IMAGE_TAG}
            docker tag ${BACKEND_IMAGE}:${IMAGE_TAG} ${BACKEND_IMAGE}:latest
            docker push ${BACKEND_IMAGE}:latest || true
            cd ..

            # build & push worker
            cd worker
            docker build -t ${WORKER_IMAGE}:${IMAGE_TAG} .
            docker push ${WORKER_IMAGE}:${IMAGE_TAG}
            docker tag ${WORKER_IMAGE}:${IMAGE_TAG} ${WORKER_IMAGE}:latest
            docker push ${WORKER_IMAGE}:latest || true
            cd ..
          '''
        }
      }
    }
  }

  post {
    always {
      sh '''
        docker rm -f ${REDIS_NAME} >/dev/null 2>&1 || true
        docker network rm ${CI_NET} >/dev/null 2>&1 || true
      '''
    }
  }
}
