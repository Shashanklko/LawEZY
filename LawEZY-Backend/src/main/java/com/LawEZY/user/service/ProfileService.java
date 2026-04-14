package com.LawEZY.user.service;

import com.LawEZY.user.entity.BaseProfile;
import java.util.Map;

public interface ProfileService {
    Object getMyProfile(String email);
    Object updateMyProfile(String email, Map<String, Object> profileData);
}
