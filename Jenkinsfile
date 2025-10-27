pipeline {
  agent { label 'agent-testing-mern' }

  environment {
    DOCKERHUB_CREDENTIALS = 'testing-mern-docker'    // you already created this
    DOCKERHUB_NAMESPACE = "ogadityahota"
    BACKEND_REPO = "${env.DOCKERHUB_NAMESPACE}/testing-mern-backend"
    WORKER_REPO  = "${env.DOCKERHUB_NAMESPACE}/testing-mern-worker"
    CI_DOCKER_NETWORK = "ci-net-testing-mern"
    TEST_REDIS_NAME = "ci-redis-testing-mern"
    TEST_REDIS_IMAGE = "redis:7-alpine"
    // IMAGE_TAG will be computed; keep a default in case BUILD_NUMBER/GIT_COMMIT aren't set
    IMAGE_TAG = "${env.BUILD_NUMBER ?: 'local'}-${env.GIT_COMMIT?.take(8) ?: 'local'}"
    // Jenkins secret id for Neon DB connection string (create secret text in Jenkins)
    NEON_CRED_ID = "postgresql://neondb_owner:npg_BK1mWS0oaLGz@ep-rapid-hat-a4ostuob-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    // stage('Compute tag') {
    //   steps {
    //     script {
    //       // compute a stable tag — fallback to timestamp if nothing else
    //       def commit = env.GIT_COMMIT ?: sh(script: "git rev-parse --short HEAD || echo local", returnStdout: true).trim()
    //       env.IMAGE_TAG = "${env.BUILD_NUMBER ?: 'manual'}-${commit}"
    //       echo "IMAGE_TAG = ${env.IMAGE_TAG}"
    //     }
    //   }
    // }

    stage('Prepare Docker network') {
      steps {
        sh '''
          docker network inspect ${CI_DOCKER_NETWORK} >/dev/null 2>&1 || docker network create ${CI_DOCKER_NETWORK}
        '''
      }
    }

    stage('Start test Redis (for worker tests)') {
      steps {
        sh '''
          docker rm -f ${TEST_REDIS_NAME} || true
          docker run -d --name ${TEST_REDIS_NAME} --network ${CI_DOCKER_NETWORK} ${TEST_REDIS_IMAGE}
          # wait for redis ready
          for i in $(seq 1 10); do
            docker exec ${TEST_REDIS_NAME} redis-cli ping | grep -q PONG && break || sleep 1
          done
        '''
      }
    }

    stage('Backend: run unit tests (needs Neon DB)') {
      steps {
        // inject NEON DB connection string from Jenkins secret text (id: neon-db-url)
        withCredentials([string(credentialsId: env.NEON_CRED_ID, variable: 'DATABASE_URL')]) {
          dir('backend') {
            sh '''
              # Run backend tests inside oven/bun container so agent doesn't need bun installed
              docker run --rm \
                -v "$PWD":/work -w /work \
                --network ${CI_DOCKER_NETWORK} \
                -e DATABASE_URL="${DATABASE_URL}" \
                oven/bun:latest bash -lc '
                  bun install --no-save || true
                  # run unit tests which require DATABASE_URL (Neon)
                  DATABASE_URL="${DATABASE_URL}" bun run test:unit
                '
            '''
          }
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

            # Build & push backend
            cd backend
            docker build -t ${BACKEND_REPO}:${IMAGE_TAG} .
            docker push ${BACKEND_REPO}:${IMAGE_TAG}
            docker tag ${BACKEND_REPO}:${IMAGE_TAG} ${BACKEND_REPO}:latest
            docker push ${BACKEND_REPO}:latest || true
            cd ..

            # Build & push worker
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
  } // stages

  post {
    always {
      sh '''
        docker rm -f ${TEST_REDIS_NAME} || true
        docker network rm ${CI_DOCKER_NETWORK} || true
      '''
    }
    success {
      echo "Success: pushed ${BACKEND_REPO}:${IMAGE_TAG} and ${WORKER_REPO}:${IMAGE_TAG}"
    }
    failure {
      echo "Pipeline failed — check logs"
    }
  }
}
