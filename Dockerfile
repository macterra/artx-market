# Use the official Ubuntu as a base image
FROM ubuntu:latest

# Install Node.js, npm and Git
RUN apt-get update && \
    apt-get install -y git curl wget

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
RUN source ~/.bashrc
RUN nvm install lts
RUN nvm use lts

RUN wget https://dist.ipfs.tech/kubo/v0.21.0/kubo_v0.21.0_linux-amd64.tar.gz
RUN tar -xvzf kubo_v0.21.0_linux-amd64.tar.gz
RUN cd kubo && bash install.sh

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the production build to the working directory
COPY . .

# Expose the port the app will run on
EXPOSE 5000

# Run
CMD ["npm", "start"]
