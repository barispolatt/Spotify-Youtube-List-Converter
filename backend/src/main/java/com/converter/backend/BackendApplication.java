package com.converter.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.Objects;
import java.util.stream.Collectors;
import jakarta.annotation.PreDestroy;

@SpringBootApplication
@RestController
@RequestMapping("/api/v1/youtube")
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }

    @Value("${cors.allowed.origins:http://localhost:3000,http://localhost:5173}")
    private String allowedOrigins;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // Global CORS configuration - restricted to known frontend domains
    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("Content-Type", "Authorization"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }

    // Scale thread pool dynamically based on environment (available processors) to
    // improve performance. Min 20 for I/O-bound yt-dlp processes on t3a.small.
    private final ExecutorService executor = Executors.newFixedThreadPool(
            Math.max(20, Runtime.getRuntime().availableProcessors() * 2));

    @PreDestroy
    public void cleanup() {
        executor.shutdown();
    }

    // ── Original blocking endpoint (kept for backward compatibility) ──────────
    @PostMapping("/search")
    public List<SearchResult> searchTracks(@RequestBody List<String> queries) {
        // Guard against empty or null query lists
        if (queries == null || queries.isEmpty()) {
            return List.of();
        }

        // Start an asynchronous search for every track name
        List<CompletableFuture<SearchResult>> futures = queries.stream()
                .filter(query -> query != null && !query.trim().isEmpty())
                .map(query -> CompletableFuture.supplyAsync(() -> findUrl(query), executor))
                .collect(Collectors.toList());

        // Wait for completing all searches and collect results
        return futures.stream()
                .map(CompletableFuture::join)
                .collect(Collectors.toList());
    }

    // ── SSE streaming endpoint ────────────────────────────────────────────────
    // Emits named SSE events as each track is resolved, so the frontend can
    // update the progress bar in real-time without waiting for all results.
    @PostMapping(value = "/search/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter searchTracksStream(@RequestBody List<String> queries) {
        // 5-minute timeout — generous for very large playlists
        SseEmitter emitter = new SseEmitter(300_000L);

        if (queries == null || queries.isEmpty()) {
            try {
                emitter.send(SseEmitter.event().name("error")
                        .data("{\"message\":\"No tracks provided\"}"));
                emitter.complete();
            } catch (IOException e) {
                emitter.completeWithError(e);
            }
            return emitter;
        }

        List<String> validQueries = queries.stream()
                .filter(q -> q != null && !q.trim().isEmpty())
                .collect(Collectors.toList());

        int total = validQueries.size();
        AtomicInteger completed = new AtomicInteger(0);

        // Send the total count immediately so the frontend can set the denominator
        try {
            emitter.send(SseEmitter.event().name("total")
                    .data("{\"total\":" + total + "}"));
        } catch (IOException e) {
            emitter.completeWithError(e);
            return emitter;
        }

        // Dispatch all track searches concurrently; emit each result as it finishes
        List<CompletableFuture<Void>> futures = validQueries.stream()
                .map(query -> CompletableFuture.runAsync(() -> {
                    SearchResult result = findUrl(query);
                    int current = completed.incrementAndGet();
                    try {
                        Map<String, Object> payload = Map.of(
                                "current", current,
                                "total", total,
                                "track", result.track(),
                                "url", result.url() != null ? result.url() : "",
                                "status", result.status(),
                                "message", result.message() != null ? result.message() : "");
                        String json = Objects.requireNonNull(objectMapper.writeValueAsString(payload));
                        emitter.send(SseEmitter.event().name("track").data(json));
                    } catch (IOException e) {
                        emitter.completeWithError(e);
                    }
                }, executor))
                .collect(Collectors.toList());

        // When every future is done, send the summary "done" event and close the stream
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .thenRun(() -> {
                    try {
                        emitter.send(SseEmitter.event().name("done")
                                .data("{\"total\":" + total + "}"));
                        emitter.complete();
                    } catch (IOException e) {
                        emitter.completeWithError(e);
                    }
                })
                .exceptionally(ex -> {
                    Throwable cause = ex != null ? ex : new RuntimeException("Unknown error");
                    emitter.completeWithError(cause);
                    return null;
                });

        return emitter;
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
                return new SearchResult(query, youtubeUrl, "success", null);
            }
            return new SearchResult(query, null, "not_found", "No YouTube result found for this track");
        } catch (Exception e) {
            e.printStackTrace();
            return new SearchResult(query, null, "error", "Search failed: " + e.getMessage());
        }
    }

    // DTO with structured status and error message
    public record SearchResult(String track, String url, String status, String message) {
    }
}