package com.LawEZY.common.exception;

import com.LawEZY.common.response.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.context.request.WebRequest;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<String>> handleNoResourceFound(
            org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        // Silently return 404 for missing static resources (e.g., favicon.ico)
        return new ResponseEntity<>(ApiResponse.error("Resource not found"), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<String>> handleAllExceptions(Exception ex, WebRequest request) {
        log.error("Unhandled Institutional Exception: ", ex);
        
        String message = "A system error occurred. Please contact institutional support.";
        
        // In Dev/Debug mode, we could provide more info, but for production security:
        return new ResponseEntity<>(ApiResponse.error(message), HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<String>> handleResourceNotFound(ResourceNotFoundException ex) {
        return new ResponseEntity<>(ApiResponse.error(ex.getMessage()), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ApiResponse<String>> handleAccessDeniedException(Exception ex, WebRequest request) {
        return new ResponseEntity<>(ApiResponse.error("Access Denied: Insufficient permissions for this command."), HttpStatus.FORBIDDEN);
    }
}
