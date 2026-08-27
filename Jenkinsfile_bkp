pipeline {
    agent any
    environment {
        HARBOR_HOST = 'harbor.yourdomain.com'
        HARBOR_PROJECT = 'address-book'
        IMAGE_NAME = 'address-book-api'
        IMAGE_TAG = "${BUILD_NUMBER}"
        SONAR_HOST_URL = 'http://192.168.1.184:9000/'
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        stage('SonarQube Analysis') {
            steps {
                script {
                    withCredentials([string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN')]) {
                        def scannerHome = tool 'SonarScanner'
                        sh """
                            ${scannerHome}/bin/sonar-scanner \
                            -Dsonar.projectKey=address-book-app \
                            -Dsonar.sources=. \
                            -Dsonar.host.url=${SONAR_HOST_URL} \
                            -Dsonar.login=${SONAR_TOKEN}
                        """
                    }
                }
            }
        }
        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }
        stage('Build & Push to Harbor') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'harbor-credentials', usernameVariable: 'HARBOR_USER', passwordVariable: 'HARBOR_PASS')]) {
                        sh """
                            docker build -t ${HARBOR_HOST}/${HARBOR_PROJECT}/${IMAGE_NAME}:${IMAGE_TAG} .
                            docker build -t ${HARBOR_HOST}/${HARBOR_PROJECT}/${IMAGE_NAME}:latest .
                            echo \$HARBOR_PASS | docker login ${HARBOR_HOST} -u \$HARBOR_USER --password-stdin
                            docker push ${HARBOR_HOST}/${HARBOR_PROJECT}/${IMAGE_NAME}:${IMAGE_TAG}
                            docker push ${HARBOR_HOST}/${HARBOR_PROJECT}/${IMAGE_NAME}:latest
                        """
                    }
                }
            }
        }
        stage('Update GitOps Repo') {
            steps {
                script {
                    withCredentials([gitUsernamePassword(credentialsId: 'git-credentials', gitToolName: 'git-tool')]) {
                        sh """
                            git clone https://github.com/bus57790/address-book-gitops.git
                            cd address-book-gitops
                            sed -i 's|image: .*|image: ${HARBOR_HOST}/${HARBOR_PROJECT}/${IMAGE_NAME}:${IMAGE_TAG}|g' deployment.yaml
                            git config user.name "Jenkins CI"
                            git config user.email "jenkins@yourdomain.com"
                            git commit -am "Update image to version ${IMAGE_TAG}"
                            git push origin main
                        """
                    }
                }
            }
        }
    }
    post {
        always {
            sh 'docker logout ${HARBOR_HOST}'
        }
        success {
            slackSend(channel: '#deployments', color: 'good', message: "SUCCESSFUL: Address Book Build #${BUILD_NUMBER} passed tests and updated GitOps repo.")
        }
        failure {
            slackSend(channel: '#deployments', color: 'danger', message: "FAILED: Address Book Build #${BUILD_NUMBER} failed. Check Jenkins logs.")
        }
    }
}
