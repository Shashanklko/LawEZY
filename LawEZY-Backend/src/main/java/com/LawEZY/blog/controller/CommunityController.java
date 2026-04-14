package com.LawEZY.blog.controller;

import com.LawEZY.blog.entity.Comment;
import com.LawEZY.blog.entity.Post;
import com.LawEZY.blog.enums.PostType;
import com.LawEZY.blog.service.PostService;
import com.LawEZY.blog.dto.PostRequest;

import org.springframework.lang.NonNull;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/community")
public class CommunityController {

    @Autowired
    private PostService postService;

    @Autowired
    private com.LawEZY.user.repository.UserRepository userRepository;

    @PostMapping("/posts")
    public ResponseEntity<Post> createPost(@RequestBody @NonNull PostRequest request) {
        request.setAuthorId(getCurrentUserId());
        if (request.getType() == null) request.setType(PostType.DISCUSSION);
        return ResponseEntity.ok(postService.createPost(request));
    }

    @GetMapping("/feed")
    public ResponseEntity<List<Post>> getFeed(@RequestParam(required = false) PostType type) {
        return ResponseEntity.ok(postService.getFeed(type));
    }

    @GetMapping("/posts/{postId}")
    public ResponseEntity<Post> getPost(@PathVariable @NonNull String postId) {
        return ResponseEntity.ok(postService.getPostById(postId));
    }

    @PostMapping("/posts/{postId}/like")
    public ResponseEntity<Void> toggleLike(@PathVariable @NonNull String postId) {
        postService.toggleLike(postId, getCurrentUserId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/posts/{postId}/comment")
    public ResponseEntity<Comment> addComment(
            @PathVariable @NonNull String postId,
            @RequestBody Map<String, String> payload) {
        String content = payload.get("content");
        return ResponseEntity.ok(postService.addComment(postId, getCurrentUserId(), content));
    }

    @GetMapping("/posts/{postId}/comments")
    public ResponseEntity<List<Comment>> getComments(@PathVariable @NonNull String postId) {
        return ResponseEntity.ok(postService.getCommentsByPost(postId));
    }

    @PutMapping("/posts/{postId}")
    public ResponseEntity<Post> updatePost(
            @PathVariable @NonNull String postId,
            @RequestBody @NonNull PostRequest request) {
        return ResponseEntity.ok(postService.updatePost(postId, getCurrentUserId(), request));
    }

    @DeleteMapping("/posts/{postId}")
    public ResponseEntity<Void> deletePost(@PathVariable @NonNull String postId) {
        postService.deletePost(postId, getCurrentUserId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/posts/{postId}/poll/vote/{optionId}")
    public ResponseEntity<com.LawEZY.blog.entity.Post> vote(
            @PathVariable @NonNull String postId,
            @PathVariable @NonNull String optionId) {
        return ResponseEntity.ok(postService.voteInPoll(postId, optionId, getCurrentUserId()));
    }

    private String getCurrentUserId() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        return auth.getName();
    }
}
