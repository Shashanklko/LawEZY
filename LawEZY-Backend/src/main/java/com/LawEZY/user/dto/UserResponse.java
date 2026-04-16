package com.LawEZY.user.dto;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;
import com.LawEZY.user.enums.Role;

@Data
public class UserResponse{
    private String id;
    private String email;
    
    @JsonProperty("firstName")
    @JsonAlias("firstname")
    private String firstName;  
    
    @JsonProperty("lastName")
    @JsonAlias("lastname")
    private String lastName;
    
    private Role role;
    private String uid;

    // Institutional Token Reserves
    private Integer freeAiTokens;
    private Integer freeChatTokens;
    private Integer tokenBalance;
    private Boolean isUnlimited;
}
