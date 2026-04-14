package com.LawEZY.blog.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PollData {
    private String question;
    private List<PollOption> options = new ArrayList<>();
    private List<String> votedUserIds = new ArrayList<>();
}
