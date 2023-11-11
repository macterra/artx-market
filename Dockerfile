# Use the official Node.js LTS (Long Term Support) Alpine version as the base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the client build to the frontend directory
COPY frontend/src ./frontend/src
COPY frontend/public ./frontend/public
COPY frontend/package*.json ./frontend/

# Build client
RUN cd frontend && npm ci && npm run build

COPY *.js .

# Expose the port the app will run on
EXPOSE 5000

# Run
CMD ["npm", "start"]
