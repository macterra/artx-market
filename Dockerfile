# Use the official Node.js LTS (Long Term Support) Alpine version as the base image
FROM node:lts-alpine

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