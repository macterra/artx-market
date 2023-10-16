# Use a base image with a shell
FROM ubuntu:latest

# Update packages
RUN apt-get update -y

# Install prerequisites
RUN apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release -y

# Add Docker's official GPG key and repository
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
RUN echo \
    "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
RUN apt-get update -y
RUN apt-get install docker-ce docker-ce-cli containerd.io -y

# Add the shell script to the Docker image
COPY pin.sh /usr/local/bin/pin.sh

# Make the script executable
RUN chmod +x /usr/local/bin/pin.sh

CMD ["/usr/local/bin/pin.sh"]
