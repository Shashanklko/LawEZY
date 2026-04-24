package com.LawEZY.common.repository;

import com.LawEZY.common.entity.ContactInquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ContactInquiryRepository extends JpaRepository<ContactInquiry, Long> {
}
