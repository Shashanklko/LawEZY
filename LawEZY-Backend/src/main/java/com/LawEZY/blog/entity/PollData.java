package com.LawEZY.blog.entity;

import java.util.ArrayList;
import java.util.List;

public class PollData {
    private String question;
    private List<PollOption> options = new ArrayList<>();
    private List<String> votedUserIds = new ArrayList<>();

    public PollData() {}
    public PollData(String question, List<PollOption> options, List<String> votedUserIds) {
        this.question = question;
        this.options = options;
        this.votedUserIds = votedUserIds;
    }

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }
    public List<PollOption> getOptions() { return options; }
    public void setOptions(List<PollOption> options) { this.options = options; }
    public List<String> getVotedUserIds() { return votedUserIds; }
    public void setVotedUserIds(List<String> votedUserIds) { this.votedUserIds = votedUserIds; }
}
