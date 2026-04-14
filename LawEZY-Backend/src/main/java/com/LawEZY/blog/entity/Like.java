package com.LawEZY.blog.entity;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Document(collection = "likes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Like {

    @Id
    private String id;

    private String postId;

    private String userId;
}
