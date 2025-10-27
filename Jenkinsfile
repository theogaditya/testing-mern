pipeline {
  agent { label 'agent-testing-mern' }

  environment {
    DOCKERHUB_CREDENTIALS = 'testing-mern-docker'
    DOCKERHUB_NAMESPACE = "ogadityahota"
    BACKEND_REPO = "${env.DOCKERHUB_NAMESPACE}/testing-mern-backend"
    WORKER_REPO  = "${env.DOCKERHUB_NAMESPACE}/testing-mern-worker"
    CI_DOCKER_NETWORK = "ci-net-testing-mern"
    TEST_REDIS_NAME = "ci-redis-testing-mern"
    TEST_REDIS_IMAGE = "redis:7-alpine"
    IMAGE_TAG = "${env.BUILD_NUMBER ?: 'local'}-${env.GIT_COMMIT?.take(8) ?: 'local'}"
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Prepare Docker network') {
      steps {
        sh '''docker network inspect ${CI_DOCKER_NETWORK} >/dev/null 2>&1 || docker network create ${CI_DOCKER_NETWORK}'''
      }
    }

    stage('Start test Redis (for worker tests)') {
      steps {
        sh '''
          docker rm -f ${TEST_REDIS_NAME} || true
          docker run -d --name ${TEST_REDIS_NAME} --network ${CI_DOCKER_NETWORK} ${TEST_REDIS_IMAGE}
          for i in $(seq 1 10); do
            docker exec ${TEST_REDIS_NAME} redis-cli ping | grep -q PONG && break || sleep 1
          done
        '''
      }
    }

    // === backend uses 'new-be' directory (your repo)
    stage('Backend: run unit tests') {
      steps {
        dir('new-be') {
          sh '''
            set -euxo pipefail
            echo "== backend working dir =="
            pwd
            ls -la

            # Run backend unit tests inside oven/bun container (no DB required)
            docker run --rm \
              -v "$PWD":/work -w /work \
              --network ${CI_DOCKER_NETWORK} \
              oven/bun:latest bash -lc '
                set -euxo pipefail
                echo "container: ls /work"
                ls -la /work || true

                if [ ! -f package.json ]; then
                  echo "ERROR: package.json not found in new-be; aborting tests."
                  exit 2
                fi

                bun install --no-save || true

                # prefer test:unit then test
                if grep -q "\"test:unit\"" package.json; then
                  echo "running bun run test:unit"
                  bun run test:unit
                elif grep -q "\"test\"" package.json; then
                  echo "running bun run test"
                  bun run test
                else
                  echo "No test scripts found"
                  exit 3
                fi
              '
          '''
        }
      }
    }

    stage('Worker: run tests (needs Redis)') {
      steps {
        dir('worker') {
          sh '''
            docker run --rm \
              -v "$PWD":/work -w /work \
              --network ${CI_DOCKER_NETWORK} \
              -e REDIS_URL="redis://ci-redis-testing-mern:6379" \
              oven/bun:latest bash -lc '
                set -euxo pipefail
                bun install --no-save || true
                REDIS_URL="redis://ci-redis-testing-mern:6379" bun run test
              '
          '''
        }
      }
    }

    stage('Docker Build & Push (backend & worker)') {
      steps {
        withCredentials([usernamePassword(credentialsId: env.DOCKERHUB_CREDENTIALS, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
          sh '''
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

            # backend (new-be)
            cd new-be
            docker build -t ${BACKEND_REPO}:${IMAGE_TAG} .
            docker push ${BACKEND_REPO}:${IMAGE_TAG}
            docker tag ${BACKEND_REPO}:${IMAGE_TAG} ${BACKEND_REPO}:latest
            docker push ${BACKEND_REPO}:latest || true
            cd ..

            # worker
            cd worker
            docker build -t ${WORKER_REPO}:${IMAGE_TAG} .
            docker push ${WORKER_REPO}:${IMAGE_TAG}
            docker tag ${WORKER_REPO}:${IMAGE_TAG} ${WORKER_REPO}:latest
            docker push ${WORKER_REPO}:latest || true
            cd ..
          '''
        }
      }
    }
  }

  post {
    always {
      sh '''
        docker rm -f ${TEST_REDIS_NAME} || true
        docker network rm ${CI_DOCKER_NETWORK} || true
      '''
    }
    success { echo "Success: pushed ${BACKEND_REPO}:${IMAGE_TAG} and ${WORKER_REPO}:${IMAGE_TAG}" }
    failure { echo "Pipeline failed — check logs" }
  }
}
