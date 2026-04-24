package com.LawEZY.blog.entity;

public class PollOption {
    private String id;
    private String text;
    private Integer votes = 0;

    public PollOption() {}
    public PollOption(String id, String text, Integer votes) {
        this.id = id;
        this.text = text;
        this.votes = votes;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public Integer getVotes() { return votes != null ? votes : 0; }
    public void setVotes(Integer votes) { this.votes = votes; }
}
