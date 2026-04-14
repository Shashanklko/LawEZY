package com.LawEZY.blog.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PollOption {
    private String id;
    private String text;
    private Integer votes = 0;
}
