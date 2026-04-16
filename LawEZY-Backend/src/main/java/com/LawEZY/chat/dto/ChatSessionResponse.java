package com.LawEZY.chat.dto;

import java.time.LocalDateTime;

import com.LawEZY.chat.enums.ChatStatus;

import lombok.Data;

@Data
public class ChatSessionResponse {
    private String id;
    private String userId;
    private String professionalId; 
    private String proUid; // Institutional Public Identifier
    private String otherPartyName;
    private String otherPartyAvatar;
    private String lastMessage;
    private String lastMessageTime;
    private Integer unreadCount;
    private ChatStatus status;
    private Integer peerTokenBalance; // Institutional visibility for liquidity status
    private LocalDateTime createdAt;
    private LocalDateTime lastUpdateAt;
}
