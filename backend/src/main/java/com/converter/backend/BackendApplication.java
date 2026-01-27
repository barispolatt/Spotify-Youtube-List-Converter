package com.converter.backend;

import org.springframework.web.bind.annotation.*;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/youtube")
@CrossOrigin(origins = "*") // React app access
public class BackendApplication {

    // Creating thread pool for better performance
    private final ExecutorService executor = Executors.newFixedThreadPool(5);

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
                query
            );
            
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
        return new SearchResult(query, "Not founded");
    }

    // DTO
    public record SearchResult(String track, String url) {}
}