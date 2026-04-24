package com.LawEZY.user.repository;

import com.LawEZY.user.entity.User;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, String>{

    Optional<User> findByEmail(String email);
    Optional<User> findByEmailOrIdOrLoginId(String email, String id, String loginId);
    boolean existsByEmail(String email);
    boolean existsByLoginId(String loginId);
    java.util.List<User> findByRoleIn(java.util.List<com.LawEZY.user.enums.Role> roles);
    long countByRoleIn(java.util.List<com.LawEZY.user.enums.Role> roles);

    // Industrial Query: Find the highest ID matching a prefix (e.g., '11NS%')
    @org.springframework.data.jpa.repository.Query(value = "SELECT id FROM users WHERE id LIKE ?1 ORDER BY id DESC LIMIT 1", nativeQuery = true)
    String findMaxIdByPrefix(String prefix);
}

// in this layer it will acts as bridge who communiticate with database
// @Repository annotation tell that this class( is bean) will handle database work
// JpaRepository<User , long> this extensive library stroing 50+ pre-written database method
// this help to run various queries without writting actual SQL Queries.
//