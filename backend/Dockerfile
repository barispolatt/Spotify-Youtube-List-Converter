# Build java with Maven
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime
FROM eclipse-temurin:17-jre-jammy

# Install python and curl for yt-dlp 
RUN apt-get update && apt-get install -y python3 curl && \n    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \n    chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# JVM settings for RAM limitations (t3.micro 1GB RAM)
ENV JAVA_OPTS="-Xmx400m -Xms256m"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]