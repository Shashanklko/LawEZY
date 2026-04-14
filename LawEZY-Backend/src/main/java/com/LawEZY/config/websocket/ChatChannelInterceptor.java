package com.LawEZY.config.websocket;

import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Component
public class ChatChannelInterceptor implements ChannelInterceptor {

    @Override
    public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.SEND.equals(accessor.getCommand())) {
            Object payloadObj = message.getPayload();
            if (payloadObj instanceof byte[]) {
                String payload = new String((byte[]) payloadObj);
                
                // SECOND LAYER ANTI-LEAKAGE: Scan raw payload for phone numbers/emails
                if (payload.matches(".*\\d{10}.*") || payload.toLowerCase().contains("whatsapp") || payload.toLowerCase().contains("@")) {
                    throw new RuntimeException("Security Violation: Direct contact sharing detected.");
                }
            }
        }
        return message;
    }
}
