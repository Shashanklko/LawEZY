package com.LawEZY.blog.repository;

import com.LawEZY.blog.entity.Post;
import com.LawEZY.blog.enums.PostType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostRepository extends MongoRepository<Post, String> {
    List<Post> findByTypeOrderByCreatedAtDesc(PostType type);
    List<Post> findAllByOrderByCreatedAtDesc();
    long countByAuthorId(String authorId);
}
