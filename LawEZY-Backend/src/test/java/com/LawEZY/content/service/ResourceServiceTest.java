package com.LawEZY.content.service;

import com.LawEZY.content.dto.ResourceRequest;
import com.LawEZY.content.entity.LegalResource;
import com.LawEZY.content.repository.ResourceRepository;
import com.LawEZY.user.entity.User;
import com.LawEZY.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ResourceServiceTest {

    @Mock
    private ResourceRepository resourceRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ResourceService resourceService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void createResource_Success() {
        ResourceRequest request = new ResourceRequest();
        request.setAuthorId("11PR01LA");
        request.setTitle("Test Resource");
        request.setContent("Content here");
        request.setCategory("IP_LAW");

        User author = new User();
        author.setId("11PR01LA");

        LegalResource resource = new LegalResource();
        resource.setTitle(request.getTitle());

        when(userRepository.findById("11PR01LA")).thenReturn(Optional.of(author));
        when(resourceRepository.save(any(LegalResource.class))).thenReturn(resource);

        LegalResource response = resourceService.createResource(request);

        assertNotNull(response);
        assertEquals("Test Resource", response.getTitle());
        verify(resourceRepository, times(1)).save(any(LegalResource.class));
    }
}
