package com.LawEZY.notification.repository;

import com.LawEZY.notification.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {
    List<Notification> findByUserIdOrderByTimestampDesc(String userId);
    List<Notification> findByUserIdAndCategoryOrderByTimestampDesc(String userId, String category);
    long countByUserIdAndReadFalse(String userId);

    @Query(value = "{ 'userId': ?0, 'read': false }", fields = "{ '_id': 1 }")
    List<Notification> findUnreadByUserId(String userId);
}
