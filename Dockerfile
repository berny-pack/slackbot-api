# this is a node.js project using express and yarn
FROM node:16-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

# Bundle app source
COPY . .

# Build app
RUN yarn build

EXPOSE 3000
CMD [ "yarn", "start" ]
