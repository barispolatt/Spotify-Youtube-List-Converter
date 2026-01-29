package com.converter.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.*;
import java.util.stream.Collectors;
import jakarta.annotation.PreDestroy;

@SpringBootApplication
@RestController
@RequestMapping("/api/v1/youtube")
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    // Global CORS configuration
    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList("*"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("*"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }

    // Creating thread pool - limited to 2 to prevent OOM on small instances
    private final ExecutorService executor = Executors.newFixedThreadPool(2);

    @PreDestroy
    public void cleanup() {
        executor.shutdown();
    }

    @PostMapping("/search")
    public List<SearchResult> searchTracks(@RequestBody List<String> queries) {
        // Start an asynchronus search for every track name
        List<CompletableFuture<SearchResult>> futures = queries.stream()
                .map(query -> CompletableFuture.supplyAsync(() -> findUrl(query), executor))
                .collect(Collectors.toList());

        // Wait for completing all searches and collect results
        return futures.stream()
                .map(CompletableFuture::join)
                .collect(Collectors.toList());
    }

    @GetMapping("/health")
    public String health() {
        return "OK";
    }

    private SearchResult findUrl(String query) {
        try {
            // prepare yt-dlp command
            // --print id: return ID (faster than parsing JSON)
            // ytsearch1: Just take first result
            ProcessBuilder pb = new ProcessBuilder(
                    "yt-dlp",
                    "--print", "%(id)s",
                    "--default-search", "ytsearch1:",
                    "--flat-playlist",
                    "--no-warnings",
                    "--ignore-errors",
                    query);

            Process p = pb.start();
            BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()));
            String videoId = reader.readLine();
            p.waitFor();

            if (videoId != null && !videoId.trim().isEmpty()) {
                String youtubeUrl = "https://music.youtube.com/watch?v=" + videoId.trim();
                return new SearchResult(query, youtubeUrl);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return new SearchResult(query, "Not found");
    }

    // DTO
    public record SearchResult(String track, String url) {
    }
}