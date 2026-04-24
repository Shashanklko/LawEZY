package com.LawEZY.user.dto;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.LawEZY.user.enums.Role;

public class UserResponse {
    private String id;
    private String email;
    
    @JsonProperty("firstName")
    @JsonAlias("firstname")
    private String firstName;  
    
    @JsonProperty("lastName")
    @JsonAlias("lastname")
    private String lastName;
    
    private String name;
    
    private Role role;
    
    private Object profile;
    private Double walletBalance;

    // Institutional Token Reserves
    @JsonProperty("freeAiTokens")
    private Integer freeAiTokens;
    @JsonProperty("freeChatTokens")
    private Integer freeChatTokens;
    @JsonProperty("freeDocTokens")
    private Integer freeDocTokens;
    @JsonProperty("aiLimit")
    private Integer aiLimit;
    @JsonProperty("docLimit")
    private Integer docLimit;
    private Integer tokenBalance;
    private Boolean isUnlimited;
    private Boolean enabled;

    public UserResponse() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public Object getProfile() { return profile; }
    public void setProfile(Object profile) { this.profile = profile; }
    public Double getWalletBalance() { return walletBalance; }
    public void setWalletBalance(Double walletBalance) { this.walletBalance = walletBalance; }
    public Integer getFreeAiTokens() { return freeAiTokens; }
    public void setFreeAiTokens(Integer freeAiTokens) { this.freeAiTokens = freeAiTokens; }
    public Integer getFreeChatTokens() { return freeChatTokens; }
    public void setFreeChatTokens(Integer freeChatTokens) { this.freeChatTokens = freeChatTokens; }
    public Integer getFreeDocTokens() { return freeDocTokens; }
    public void setFreeDocTokens(Integer freeDocTokens) { this.freeDocTokens = freeDocTokens; }
    public Integer getAiLimit() { return aiLimit; }
    public void setAiLimit(Integer aiLimit) { this.aiLimit = aiLimit; }
    public Integer getDocLimit() { return docLimit; }
    public void setDocLimit(Integer docLimit) { this.docLimit = docLimit; }
    public Integer getTokenBalance() { return tokenBalance; }
    public void setTokenBalance(Integer tokenBalance) { this.tokenBalance = tokenBalance; }
    public Boolean getIsUnlimited() { return isUnlimited; }
    public void setIsUnlimited(Boolean isUnlimited) { this.isUnlimited = isUnlimited; }
    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }
}
