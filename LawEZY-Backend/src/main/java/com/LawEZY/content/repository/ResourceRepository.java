package com.LawEZY.content.repository;

import com.LawEZY.content.entity.LegalResource;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResourceRepository extends MongoRepository<LegalResource, String> {
    List<LegalResource> findByCategoryIgnoreCase(String category);
    List<LegalResource> findByTitleContainingIgnoreCase(String keyword);
}
