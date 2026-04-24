package com.LawEZY.blog.dto;

import com.LawEZY.blog.enums.PostType;
import java.util.List;
import com.LawEZY.blog.entity.PollData;

public class PostRequest {
    private String authorId;
    private String title;
    private String content;
    private PostType type;
    private List<String> tags;
    private PollData poll;

    public PostRequest() {}

    public String getAuthorId() { return authorId; }
    public void setAuthorId(String authorId) { this.authorId = authorId; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public PostType getType() { return type; }
    public void setType(PostType type) { this.type = type; }
    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }
    public PollData getPoll() { return poll; }
    public void setPoll(PollData poll) { this.poll = poll; }
}
