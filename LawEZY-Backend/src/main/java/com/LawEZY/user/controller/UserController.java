package com.LawEZY.user.controller;

import com.LawEZY.user.dto.UserRequest;
import com.LawEZY.user.dto.UserResponse;
import com.LawEZY.user.service.UserService;

import jakarta.validation.Valid; // NEW: Needed for @Valid

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    // Notice we use UserResponse as the return type, and @Valid UserRequest as the input!
    @PostMapping 
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserRequest userRequest){
        UserResponse savedUser = userService.createUser(userRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedUser);
    }

    // Now returns a UserResponse instead of the Entity
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable String id){
        UserResponse getUser = userService.getUserById(id);
        return ResponseEntity.status(HttpStatus.OK).body(getUser);    
    }

    // Now returns a List of UserResponse
    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers(){
        List<UserResponse> getAllUser = userService.getAllUsers();
        return ResponseEntity.status(HttpStatus.OK).body(getAllUser);   
    }

    // Notice we use @Valid here too, because updating needs to follow the same rules as creating!
    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(@PathVariable String id, @Valid @RequestBody UserRequest userRequest){
        UserResponse updateuser = userService.updateUser(id, userRequest);
        return ResponseEntity.status(HttpStatus.OK).body(updateuser);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable String id){
        userService.deleteUser(id);
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build(); // 204 No Content
    }

    @PostMapping("/{id}/change-password")
    public ResponseEntity<String> changePassword(@PathVariable String id, @RequestBody java.util.Map<String, String> payload) {
        userService.changePassword(id, payload.get("current"), payload.get("new"));
        return ResponseEntity.ok("Password updated successfully");
    }

    @PostMapping("/{id}/disable")
    public ResponseEntity<String> disableUser(@PathVariable String id) {
        userService.disableUser(id);
        return ResponseEntity.ok("Account disabled successfully");
    }
}
