# hydra-env-secret
Allow Hydra Microservice to read the secret (password, API key) in ENV variables. Nowadays, we often deploy the microservice in Docker container, or better Kubernetes cloud, the secrets usually pass to the container by ENV or mount to Kubernetes pods by secret ENV.

It will fallback to the hard-coded password in config.json if no ENV variable.

# Usage

## Installation

```bash
npm install -S hydra-env-secret
```

## Configuration

`config/k8s-config.json`
```json
{
  "env_refs": ["hydra.redis.password"], // (1)
  "environment": "development",
  "hydra": {
    "serviceName": "hydra-event-bus-service",
    "serviceIP": "",
    "servicePort": 0,
    "serviceType": "hydra-event-bus",
    "serviceDescription": "Provides the Event Bus for Hydra microservices",
    "plugins": {
      "logger": {
        "logRequests": true,
        "elasticsearch": {
          "host": "elastic",
          "port": 6379,
          "index": "hydra"
        }
      }
    },
    "redis": {
      "url": "redis",
      "port": 6379,
      "db": 15,
      "password_ref": "REDIS_PASSWORD" // (2)
    }
  }
}
```

* [1] define the path to the field need to reference from ENV variable
* [2] ref field which exactly same as field name with `_ref` suffix

## Changes in code
```javascript
/*
 * lib/config-helper.js
 */
const configWrapper = require('hydra-env-secret');
const initConfig = require('../config/config.json');
module.exports = configWrapper(initConfig);
```

```javascript
/*
 * main.js
 */
const configHelper = require('./lib/config-helper');

// config.init('./config/config.json') // Before
config.init(configHelper) // After
```

# Dockerize your app
```Dockerfile
FROM node:8.7

# Create app directory
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
COPY config/k8s-config.json config/config.json

RUN npm install --production

# Bundle app source
COPY . .

EXPOSE 3000 
CMD [ "npm", "start" ]
```

Run it
```bash
docker run -e "REDIS_PASSWORD=someVeryLongPasswordToSecureYourRedis" khoinqq/hydra-event-bus-service:latest
```

## After transform
```json
{
  "env_refs": ["hydra.redis.password"],
  "environment": "development",
  "hydra": {
    "serviceName": "hydra-event-bus-service",
    "serviceIP": "",
    "servicePort": 0,
    "serviceType": "hydra-event-bus",
    "serviceDescription": "Provides the Event Bus for Hydra microservices",
    "plugins": {
      "logger": {
        "logRequests": true,
        "elasticsearch": {
          "host": "elastic",
          "port": 6379,
          "index": "hydra"
        }
      }
    },
    "redis": {
      "url": "redis",
      "port": 6379,
      "db": 15,
      "password_ref": "REDIS_PASSWORD",
      "password": "someVeryLongPasswordToSecureYourRedis"
    }
  }
}
```

# Run on Kubernetes
```yaml
# redis-secret.yaml
apiVersion: v1
data:
  redis-password: c29tZVZlcnlMb25nUGFzc3dvcmRUb1NlY3VyZVlvdXJSZWRpcw== #1
kind: Secret
metadata:
  name: redis
type: Opaque
```
```yaml
# deployment.yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  labels:
    app: hydra-event-bus-service
spec:
  replicas: 1
  template:
    metadata:
      labels:
        app: hydra-event-bus-service
    spec:
      containers:
        - name: hydra-event-bus-service
          image: "khoinqq/hydra-event-bus-service:latest"
          imagePullPolicy: Always
          env:
          - name: REDIS_PASSWORD #2
            valueFrom:
              secretKeyRef:
                name: redis
                key: redis-password #3
          ports:
            - containerPort: 3000
```
Deploy the pod
```bash
$ kubectl apply -f redis-secret.yaml
$ kubectl apply -f deployment.yaml
```

* [1] base64 encoded password 
* [2] match the value of `password_ref` in `config.json`
* [3] match the key in `redis-secret.yaml`

# Done
Please note it will fallback to the hard-coded value, so you can define both `password_ref` and `password` contains the development. This way you can use the same file for your local development works.