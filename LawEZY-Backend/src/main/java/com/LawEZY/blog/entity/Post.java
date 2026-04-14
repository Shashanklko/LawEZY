package com.LawEZY.blog.entity;

import com.LawEZY.blog.enums.PostType;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Document(collection = "posts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Post {

    @Id
    private String id;

    private String title;

    private String content;

    private PostType type;

    // authorId references the MySQL User ID
    private String authorId;
    
    // We can still store basic author info for UI performance
    private String authorName;

    @Field("like_count")
    private Integer likeCount = 0;

    @Field("comment_count")
    private Integer commentCount = 0;

    @Field("view_count")
    private Integer viewCount = 0;

    private java.util.List<String> tags = new java.util.ArrayList<>();
    
    private PollData poll;

    private LocalDateTime createdAt = LocalDateTime.now();
}
