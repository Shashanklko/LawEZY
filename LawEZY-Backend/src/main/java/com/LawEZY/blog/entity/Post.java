package com.LawEZY.blog.entity;

import com.LawEZY.blog.enums.PostType;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "posts")
public class Post {

    @Id
    private String id;
    private String title;
    private String content;
    private PostType type;
    private String authorId;
    private String authorName;

    @Field("like_count")
    private Integer likeCount = 0;

    @Field("comment_count")
    private Integer commentCount = 0;

    @Field("view_count")
    private Integer viewCount = 0;

    private List<String> tags = new ArrayList<>();
    private PollData poll;
    private LocalDateTime createdAt = LocalDateTime.now();

    public Post() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public PostType getType() { return type; }
    public void setType(PostType type) { this.type = type; }
    public String getAuthorId() { return authorId; }
    public void setAuthorId(String authorId) { this.authorId = authorId; }
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public Integer getLikeCount() { return likeCount != null ? likeCount : 0; }
    public void setLikeCount(Integer likeCount) { this.likeCount = likeCount; }
    public Integer getCommentCount() { return commentCount != null ? commentCount : 0; }
    public void setCommentCount(Integer commentCount) { this.commentCount = commentCount; }
    public Integer getViewCount() { return viewCount != null ? viewCount : 0; }
    public void setViewCount(Integer viewCount) { this.viewCount = viewCount; }
    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
    public PollData getPoll() { return poll; }
    public void setPoll(PollData poll) { this.poll = poll; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
