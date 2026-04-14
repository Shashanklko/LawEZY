package com.LawEZY.blog.dto;

import com.LawEZY.blog.enums.PostType;
import lombok.Data;

@Data
public class PostRequest {
    private String authorId;
    private String title;
    private String content;
    private PostType type;
    private java.util.List<String> tags;
    private com.LawEZY.blog.entity.PollData poll;
}
