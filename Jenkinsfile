pipeline {
    agent any
    environment {
        HARBOR_HOST     = '192.168.1.184:9443'
        HARBOR_PROJECT  = 'address-book'
        IMAGE_NAME      = 'address-book-api'
        IMAGE_TAG       = "${BUILD_NUMBER}"
        SONAR_HOST_URL  = 'http://192.168.1.184:9000/'
        SLACK_CHANNEL   = '#deployments'
    }
    stages {
        stage('Checkout & Git Metadata') {
            steps {
                script {
                    checkout scm
                    env.GIT_COMMIT_HASH   = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
                    env.GIT_COMMIT_AUTHOR = sh(script: 'git log -1 --pretty=format:"%an"', returnStdout: true).trim()
                    env.GIT_COMMIT_MSG    = sh(script: 'git log -1 --pretty=format:"%s"', returnStdout: true).trim()
                }
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
                            sed -i 's|image: .*|image: ${HARBOR_HOST}/${HARBOR_PROJECT}/${IMAGE_NAME}:${IMAGE_TAG}|g' k8s/deployment.yaml
                            git config user.name "Jenkins CI"
                            git config user.email "jenkins@yourdomain.com"
                            git commit -am "chore: update image tag to ${IMAGE_TAG} [commit: ${env.GIT_COMMIT_HASH}]"
                            git push origin main
                        """
                    }
                }
            }
        }
    }
    post {
        always {
            sh 'docker logout ${HARBOR_HOST} || true'
        }
        success {
            script {
                def duration = "${currentBuild.durationString.replace(' and counting', '')}"
                slackSend(
                    channel: env.SLACK_CHANNEL,
                    color: '#36a64f',
                    message: "*BUILD SUCCESSFUL* | Job: *${env.JOB_NAME}* [Build #${env.BUILD_NUMBER}]",
                    attachments: [
                        [
                            fallback: "Build #${env.BUILD_NUMBER} succeeded",
                            color: '#36a64f',
                            fields: [
                                [title: "Commit Hash", value: "`${env.GIT_COMMIT_HASH}`", short: true],
                                [title: "Author", value: env.GIT_COMMIT_AUTHOR, short: true],
                                [title: "Commit Message", value: env.GIT_COMMIT_MSG, short: false],
                                [title: "Pushed Image", value: "`${HARBOR_HOST}/${HARBOR_PROJECT}/${IMAGE_NAME}:${IMAGE_TAG}`", short: false],
                                [title: "Duration", value: duration, short: true],
                                [title: "Console Logs", value: "<${env.BUILD_URL}console|View Logs>", short: true]
                            ]
                        ]
                    ]
                )
            }
        }
        failure {
            script {
                def duration = "${currentBuild.durationString.replace(' and counting', '')}"
                slackSend(
                    channel: env.SLACK_CHANNEL,
                    color: '#FF0000',
                    message: "*BUILD FAILED* | Job: *${env.JOB_NAME}* [Build #${env.BUILD_NUMBER}]",
                    attachments: [
                        [
                            fallback: "Build #${env.BUILD_NUMBER} failed",
                            color: '#FF0000',
                            fields: [
                                [title: "Commit Hash", value: "`${env.GIT_COMMIT_HASH}`", short: true],
                                [title: "Author", value: env.GIT_COMMIT_AUTHOR, short: true],
                                [title: "Commit Message", value: env.GIT_COMMIT_MSG, short: false],
                                [title: "Duration", value: duration, short: true],
                                [title: "Failure Details", value: "<${env.BUILD_URL}console|View Console Output>", short: true]
                            ]
                        ]
                    ]
                )
            }
        }
    }
}
