FROM node:20-slim

# Install ffmpeg and yt-dlp system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp as a system binary (more reliable than npm package auto-download)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Remove Windows binary, not needed on Linux
RUN rm -f bin/yt-dlp.exe

# Create required directories
RUN mkdir -p uploads downloads

EXPOSE 3000

CMD ["node", "server.js"]
