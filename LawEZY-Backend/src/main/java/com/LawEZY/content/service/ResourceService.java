package com.LawEZY.content.service;

import com.LawEZY.content.entity.LegalResource;
import com.LawEZY.content.repository.ResourceRepository;
import com.LawEZY.content.dto.ResourceRequest;

import com.LawEZY.user.entity.User;
import com.LawEZY.user.repository.UserRepository;
import com.LawEZY.common.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;


import java.util.List;

@Service
public class ResourceService {

    @Autowired
    private ResourceRepository resourceRepository;

    @Autowired
    private UserRepository userRepository;

    public List<LegalResource> getAllResources(String category) {
        if (category != null) {
            return resourceRepository.findByCategoryIgnoreCase(category);
        }
        return resourceRepository.findAll();
    }

    public LegalResource updateResource(String resourceId, String content) {
        LegalResource res = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
        res.setContent(content);
        return resourceRepository.save(res);
    }

    public LegalResource getResourceById(@NonNull String id) {
        return resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
    }

    public LegalResource createResource(@NonNull ResourceRequest request) {
        User author = userRepository.findById(request.getAuthorId())
                .orElseThrow(() -> new ResourceNotFoundException("Author not found"));
        
        LegalResource resource = new LegalResource();
        resource.setTitle(request.getTitle());
        resource.setContent(request.getContent());
        resource.setCategory(request.getCategory());
        resource.setAuthorId(author.getId());
        resource.setAuthorName(author.getName());
        resource.setCoverUrl(request.getCoverUrl());
        resource.setAbstractText(request.getAbstractText());
        resource.setDriveLink(request.getDriveLink());
        resource.setFileUrl(request.getFileUrl());
        return resourceRepository.save(resource);
    }

    public void deleteResource(@NonNull String id) {
        LegalResource resource = getResourceById(id);
        resourceRepository.delete(resource);
    }
}
