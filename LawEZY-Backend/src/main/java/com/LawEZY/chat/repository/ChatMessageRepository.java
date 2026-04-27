package com.LawEZY.chat.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.LawEZY.chat.model.ChatMessage;

public interface ChatMessageRepository extends MongoRepository<ChatMessage , String> {

    List<ChatMessage> findByChatSessionIdOrderByTimestampAsc(String chatSessionId);
    java.util.Optional<ChatMessage> findTopByChatSessionIdOrderByTimestampDesc(String chatSessionId);
    void deleteAllByChatSessionId(String chatSessionId);
    long countByChatSessionId(String chatSessionId);
    long countByChatSessionIdAndReceiverIdAndIsReadFalse(String chatSessionId, String receiverId);
    long countByReceiverIdAndIsReadFalse(String receiverId);
    List<ChatMessage> findByChatSessionIdAndReceiverIdAndIsReadFalse(String chatSessionId, String receiverId);
}
