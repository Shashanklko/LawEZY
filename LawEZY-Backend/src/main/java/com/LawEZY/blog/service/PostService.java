package com.LawEZY.blog.service;

import com.LawEZY.blog.entity.Comment;
import com.LawEZY.blog.entity.Like;
import com.LawEZY.blog.entity.Post;
import com.LawEZY.blog.enums.PostType;
import com.LawEZY.blog.dto.PostRequest;
import com.LawEZY.blog.entity.PollData;
import com.LawEZY.blog.entity.PollOption;

import com.LawEZY.blog.repository.CommentRepository;
import com.LawEZY.blog.repository.LikeRepository;
import com.LawEZY.blog.repository.PostRepository;
import com.LawEZY.user.entity.User;
import com.LawEZY.user.repository.UserRepository;
import com.LawEZY.common.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PostService {

    @Autowired
    private PostRepository postRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private LikeRepository likeRepository;

    @Autowired
    private UserRepository userRepository;

    public Post createPost(@NonNull PostRequest request) {
        String identifier = request.getAuthorId();
        User author = userRepository.findById(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .orElseThrow(() -> new ResourceNotFoundException("Author not found: " + identifier));
        
        // Institutional governance check: Admins and Experts have high-authority access.
        // Engagement metrics are tracked for account reputation.

        
        Post post = new Post();
        post.setAuthorId(author.getId());
        post.setAuthorName(getDisplayName(author));
        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        post.setType(request.getType());
        post.setTags(request.getTags() != null ? request.getTags() : new java.util.ArrayList<>());
        post.setPoll(request.getPoll());
        return postRepository.save(post);
    }

    @NonNull
    public List<Post> getFeed(@Nullable PostType type) {
        if (type != null) {
            return postRepository.findByTypeOrderByCreatedAtDesc(type);
        }
        return postRepository.findAllByOrderByCreatedAtDesc();
    }

    public void toggleLike(@NonNull String postId, @NonNull String userId) {
        if (likeRepository.existsByPostIdAndUserId(postId, userId)) {
            likeRepository.deleteByPostIdAndUserId(postId, userId);
            updateLikeCount(postId, -1);
        } else {
            postRepository.findById(postId)
                    .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
            
            Like like = new Like();
            like.setPostId(postId);
            like.setUserId(userId);
            likeRepository.save(like);
            updateLikeCount(postId, 1);
        }
    }

    @NonNull
    public Comment addComment(@NonNull String postId, @NonNull String authorId, @NonNull String content) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
        User author = userRepository.findById(authorId)
                .or(() -> userRepository.findByEmail(authorId))
                .orElseThrow(() -> new ResourceNotFoundException("Author not found: " + authorId));
        
        Comment comment = new Comment();
        comment.setPostId(postId);
        comment.setAuthorId(authorId);
        comment.setAuthorName(getDisplayName(author));
        comment.setContent(content);
        
        Comment savedComment = commentRepository.save(comment);
        
        Integer currentCount = post.getCommentCount();
        post.setCommentCount(currentCount != null ? currentCount + 1 : 1);
        postRepository.save(post);
        
        return savedComment;
    }

    public Post getPostById(@NonNull String postId) {
        return postRepository.findById(postId)
                .orElseThrow(() -> new ResourceNotFoundException("Post not found"));
    }

    public Post updatePost(@NonNull String postId, @NonNull String identifier, @NonNull PostRequest request) {
        Post post = getPostById(postId);
        String requesterUid = resolveUid(identifier);
        if (!post.getAuthorId().equals(requesterUid)) {
            throw new RuntimeException("Unauthorized: Only the author can update this post.");
        }
        post.setTitle(request.getTitle());
        post.setContent(request.getContent());
        post.setType(request.getType());
        return postRepository.save(post);
    }

    public void deletePost(@NonNull String postId, @NonNull String identifier) {
        Post post = getPostById(postId);
        String requesterUid = resolveUid(identifier);
        if (!post.getAuthorId().equals(requesterUid)) {
            throw new RuntimeException("Unauthorized: Only the author can delete this post.");
        }
        postRepository.delete(post);
    }

    public Post voteInPoll(@NonNull String postId, @NonNull String optionId, @NonNull String userId) {
        Post post = getPostById(postId);
        if (post.getPoll() == null) throw new RuntimeException("No poll found on this post.");
        
        PollData poll = post.getPoll();
        if (poll.getVotedUserIds().contains(userId)) {
            throw new RuntimeException("You have already voted in this poll.");
        }
        
        boolean optionFound = false;
        for (PollOption opt : poll.getOptions()) {
            if (opt.getId().equals(optionId)) {
                opt.setVotes(opt.getVotes() != null ? opt.getVotes() + 1 : 1);
                optionFound = true;
                break;
            }
        }
        
        if (!optionFound) throw new ResourceNotFoundException("Poll option not found: " + optionId);
        
        poll.getVotedUserIds().add(userId);
        return postRepository.save(post);
    }

    private void updateLikeCount(@NonNull String postId, int delta) {
        postRepository.findById(postId).ifPresent(post -> {
            Integer currentLikes = post.getLikeCount();
            post.setLikeCount(currentLikes != null ? Math.max(0, currentLikes + delta) : Math.max(0, delta));
            postRepository.save(post);
        });
    }

    public List<Comment> getCommentsByPost(@NonNull String postId) {
        return commentRepository.findByPostIdOrderByCreatedAtAsc(postId);
    }

    private String getDisplayName(User user) {
        if (user.getFirstName() != null && !user.getFirstName().isEmpty()) {
            String fullName = user.getFirstName();
            if (user.getLastName() != null && !user.getLastName().isEmpty()) {
                fullName += " " + user.getLastName();
            }
            return fullName;
        }
        return user.getEmail(); // Fallback to email if names are not set
    }

    private String resolveUid(String identifier) {
        if (identifier == null) return null;
        if (!identifier.contains("@")) return identifier;
        return userRepository.findByEmail(identifier)
                .map(User::getId)
                .orElse(identifier);
    }
}
