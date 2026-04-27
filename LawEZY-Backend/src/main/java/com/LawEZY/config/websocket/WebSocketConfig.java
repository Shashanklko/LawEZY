package com.LawEZY.config.websocket;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Autowired
    private ChatChannelInterceptor chatChannelInterceptor;

    @Autowired
    private WebSocketAuthInterceptor webSocketAuthInterceptor;

    @Value("${app.cors.allowed-origins:http://localhost:5173,https://lawezy.onrender.com,https://lawezy-sigma.vercel.app,https://lawezy.in,https://www.lawezy.in}")
    private String[] allowedOrigins;

    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry config) {
        // Enable a simple memory-based message broker
        // /topic - for broadcast (e.g., session rooms)
        // /queue - for private user-specific messages (e.g., notifications)
        config.enableSimpleBroker("/topic", "/queue");
        
        // Set user destination prefix for private messaging
        config.setUserDestinationPrefix("/user");
        
        // Prefix for messages that are bound for methods annotated with @MessageMapping
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        // The URL where clients connect to the WebSocket server
        // This replaces the Node.js Socket.io endpoint
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .addInterceptors(webSocketAuthInterceptor)
                .withSockJS();
        
        // Also register a raw WebSocket endpoint (no SockJS) for native clients
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .addInterceptors(webSocketAuthInterceptor);
    }

    @Override
    public void configureClientInboundChannel(@NonNull ChannelRegistration registration) {
        // Register our JWT + Anti-Leakage interceptor to scan all incoming messages
        registration.interceptors(chatChannelInterceptor);
    }
}