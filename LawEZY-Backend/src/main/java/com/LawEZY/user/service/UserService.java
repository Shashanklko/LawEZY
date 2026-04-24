package com.LawEZY.user.service;

import com.LawEZY.user.dto.UserRequest;
import com.LawEZY.user.dto.UserResponse;
import com.LawEZY.user.dto.ProfessionalProfileDTO;
import java.util.List;

public interface UserService {
    UserResponse createUser(UserRequest userRequest);
    UserResponse getUserById(String id);
    List<UserResponse> getAllUsers();
    UserResponse getUserByEmail(String email);
    UserResponse updateUser(String id, UserRequest userRequest);
    void deleteUser(String id);
    void changePassword(String userId, String currentPassword, String newPassword);
    void disableUser(String userId);
    List<ProfessionalProfileDTO> getAllProfessionals();
    ProfessionalProfileDTO getProfessionalById(String id);
    ProfessionalProfileDTO getProfessionalBySlug(String slug);
    void updateProfessionalStatus(String id, boolean online);
    void verifyExpert(String id);
    void updatePassword(String email, String newPassword);
}