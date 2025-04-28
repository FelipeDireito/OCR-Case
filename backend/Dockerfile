FROM node:22-alpine

# Install dependencies for Tesseract, PDF processing, and bcrypt
RUN apk add --no-cache \
    tesseract-ocr \
    poppler-utils \
    g++ \
    make \
    python3 \
    libc6-compat

WORKDIR /app

COPY package*.json ./

# Install dependencies with --force to bypass dependency conflicts
RUN npm install --force

# Copy the rest of the application
COPY . .

# Rebuild bcrypt for the current architecture
RUN npm uninstall bcrypt && npm install bcrypt --force

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

EXPOSE 5005

CMD ["npm", "run", "start:dev"]
