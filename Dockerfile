# Use the official Ubuntu as a base image
FROM ubuntu:latest

# Install necessary packages
RUN apt-get update && \
    apt-get install -y curl build-essential libssl-dev git wget

# Install NVM
ENV NVM_DIR /root/.nvm
ENV NODE_VERSION 18.15.0

RUN curl --silent -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# Install Node.js and npm
RUN /bin/bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION && nvm alias default $NODE_VERSION && nvm use default"

# Add Node and npm to path so the commands are available
ENV NODE_PATH $NVM_DIR/versions/node/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

RUN wget https://dist.ipfs.tech/kubo/v0.21.0/kubo_v0.21.0_linux-amd64.tar.gz
RUN tar -xvzf kubo_v0.21.0_linux-amd64.tar.gz
RUN cd kubo && bash install.sh
RUN ipfs init

RUN git config --global user.email "davidmc@gmail.com"
RUN git config --global user.name "David McFadzean"
RUN git config --global --add safe.directory /app/data

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the production build to the working directory
COPY . .

# Build client
RUN npm run build-frontend

# Expose the port the app will run on
EXPOSE 5000

# Run
CMD ["npm", "start"]
