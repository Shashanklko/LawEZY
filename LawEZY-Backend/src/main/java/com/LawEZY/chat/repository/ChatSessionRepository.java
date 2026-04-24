package com.LawEZY.chat.repository;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.LawEZY.chat.enums.ChatStatus;
import com.LawEZY.chat.model.ChatSession;


import org.springframework.data.mongodb.repository.Query;

public interface ChatSessionRepository extends MongoRepository<ChatSession, String>{

    List<ChatSession> findByUserId(String userId);
    List<ChatSession> findByProfessionalId(String professionalId);
    
    List<ChatSession> findByUserIdIn(List<String> identities);
    List<ChatSession> findByProfessionalIdIn(List<String> identities);

    List<ChatSession> findByUserIdAndStatus(String userId, ChatStatus status);
    List<ChatSession> findByProfessionalIdAndStatus(String professionalId, ChatStatus status);
    List<ChatSession> findByUserIdAndProfessionalIdAndStatus(String userId, String professionalId, ChatStatus status);
}

